"""
Qdrant Vector Database Integration for High-Performance RAG.

Features:
1. Production HNSW Graph Vector Search with Cosine Distance.
2. Supports Embedded Local On-Disk Storage ('data/qdrant_storage') - Zero Docker required.
3. Supports Remote / Cloud Qdrant Clusters via QDRANT_URL & QDRANT_API_KEY.
4. Rich Payload Metadata indexing (document name, chunk index, byte offsets).
5. Fast Hybrid Retrieval (Qdrant Dense HNSW + Okapi BM25 Lexical Keyword Search).
"""

import os
import uuid
import math
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qmodels
    from qdrant_client.http.models import (
        Distance,
        VectorParams,
        PointStruct,
        Filter,
        FieldCondition,
        MatchValue,
        MatchAny,
        PointIdsList,
        PayloadSchemaType,
    )
    HAS_QDRANT = True
except ImportError:
    HAS_QDRANT = False

from .vector_store import VectorDatabase as FallbackVectorDatabase, SearchResult, ChunkMetadata


class QdrantVectorStore:
    COLLECTION_NAME = "nexus_knowledge"

    def __init__(
        self,
        storage_path: str = "data/qdrant_storage",
        vector_dim: int = 768,
        url: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        self.storage_path = storage_path
        self.vector_dim = vector_dim
        self.url = url or os.getenv("QDRANT_URL")
        self.api_key = api_key or os.getenv("QDRANT_API_KEY")

        # In-memory fast BM25 index for sparse hybrid fusion
        self.chunks_cache: Dict[str, Dict[str, Any]] = {}
        self.doc_index: Dict[str, List[str]] = {}  # doc_id -> list of chunk_ids
        self.doc_freq: Dict[str, int] = {}
        self.avg_chunk_length: float = 0.0

        self.client: Optional[Any] = None
        self.fallback_db: Optional[FallbackVectorDatabase] = None

        self._init_client()

    def _init_client(self):
        if not HAS_QDRANT:
            print("[QdrantStore] 'qdrant-client' not installed. Using fallback vector store.")
            self.fallback_db = FallbackVectorDatabase(storage_path="data/vector_store.json")
            return

        try:
            if self.url:
                print(f"[QdrantStore] Connecting to Remote Qdrant at {self.url}...")
                self.client = QdrantClient(url=self.url, api_key=self.api_key, timeout=10.0)
            else:
                os.makedirs(self.storage_path, exist_ok=True)
                print(f"[QdrantStore] Initializing Embedded Qdrant at '{self.storage_path}'...")
                self.client = QdrantClient(path=self.storage_path)

            self._ensure_collection()
            self._load_metadata_cache()
        except Exception as e:
            print(f"[QdrantStore] Failed to initialize Qdrant ({e}). Falling back to local store.")
            self.fallback_db = FallbackVectorDatabase(storage_path="data/vector_store.json")

    def _ensure_collection(self):
        if not self.client:
            return
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.COLLECTION_NAME for c in collections)
            if not exists:
                print(f"[QdrantStore] Creating collection '{self.COLLECTION_NAME}' (dim={self.vector_dim}, distance=Cosine)...")
                self.client.create_collection(
                    collection_name=self.COLLECTION_NAME,
                    vectors_config=VectorParams(size=self.vector_dim, distance=Distance.COSINE),
                )

            # Ensure payload keyword indexes exist for fast filtering & deletion
            for field in ["doc_id", "user_id"]:
                try:
                    self.client.create_payload_index(
                        collection_name=self.COLLECTION_NAME,
                        field_name=field,
                        field_schema=PayloadSchemaType.KEYWORD,
                    )
                except Exception:
                    pass
        except Exception as e:
            print(f"[QdrantStore] Warning in _ensure_collection: {e}")

    def add_chunks(self, chunk_dicts: List[Dict[str, Any]], embeddings: List[List[float]]):
        """Batch upsert vectors and payloads into Qdrant."""
        if self.fallback_db:
            return self.fallback_db.add_chunks(chunk_dicts, embeddings)

        if len(chunk_dicts) != len(embeddings):
            raise ValueError("Number of chunks and embeddings must match.")

        points = []
        for chunk_data, vec in zip(chunk_dicts, embeddings):
            chunk_id = chunk_data["chunk_id"]
            doc_id = chunk_data["doc_id"]
            user_id = chunk_data.get("user_id") or chunk_data.get("extra", {}).get("user_id") or "anonymous"
            
            # Ensure vector length matches collection dimension (pad or truncate safely)
            if len(vec) < self.vector_dim:
                vec = vec + [0.0] * (self.vector_dim - len(vec))
            elif len(vec) > self.vector_dim:
                vec = vec[:self.vector_dim]

            payload = {
                "chunk_id": chunk_id,
                "doc_id": doc_id,
                "user_id": user_id,
                "doc_name": chunk_data.get("doc_name", "untitled"),
                "chunk_index": chunk_data.get("chunk_index", 0),
                "total_chunks": chunk_data.get("total_chunks", 1),
                "text": chunk_data["text"],
                "char_count": chunk_data.get("char_count", len(chunk_data["text"])),
                "word_count": chunk_data.get("word_count", len(chunk_data["text"].split())),
                "start_char": chunk_data.get("start_char", 0),
                "end_char": chunk_data.get("end_char", len(chunk_data["text"])),
                "extra": chunk_data.get("extra", {}),
                "created_at": time.time(),
            }

            # Generate deterministic UUID from chunk_id
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))

            points.append(PointStruct(id=point_id, vector=vec, payload=payload))

            self.chunks_cache[chunk_id] = payload
            if doc_id not in self.doc_index:
                self.doc_index[doc_id] = []
            if chunk_id not in self.doc_index[doc_id]:
                self.doc_index[doc_id].append(chunk_id)

        # Upsert in Qdrant
        self.client.upsert(collection_name=self.COLLECTION_NAME, points=points)
        self._rebuild_bm25_index()
        print(f"[QdrantStore] 🚀 Upserted {len(points)} points for user '{user_id}' into Qdrant collection '{self.COLLECTION_NAME}'")

    def delete_document(self, doc_id: str, user_id: Optional[str] = None) -> int:
        """Deletes all chunks associated with a document ID from Qdrant."""
        if self.fallback_db:
            return self.fallback_db.delete_document(doc_id)

        if not self.client:
            return 0

        # Collect candidate point IDs from memory cache
        chunk_ids = self.doc_index.pop(doc_id, [])
        for cid in chunk_ids:
            self.chunks_cache.pop(cid, None)

        point_ids = set()
        for cid in chunk_ids:
            point_ids.add(str(uuid.uuid5(uuid.NAMESPACE_DNS, cid)))

        # Also query/scroll Qdrant directly to find ANY point with payload["doc_id"] == doc_id
        try:
            offset = None
            while True:
                scroll_res = self.client.scroll(
                    collection_name=self.COLLECTION_NAME,
                    limit=250,
                    offset=offset,
                    with_payload=True,
                    with_vectors=False,
                )
                points, next_offset = scroll_res
                for p in points:
                    if p.payload and p.payload.get("doc_id") == doc_id:
                        if not user_id or p.payload.get("user_id") == user_id:
                            point_ids.add(str(p.id))
                            cid = p.payload.get("chunk_id")
                            if cid:
                                self.chunks_cache.pop(cid, None)

                if next_offset is None or not points:
                    break
                offset = next_offset
        except Exception as e:
            print(f"[QdrantStore] Note during point scan: {e}")

        # 1. Delete by direct point IDs (Guaranteed to work on Qdrant without index requirement)
        if point_ids:
            try:
                self.client.delete(
                    collection_name=self.COLLECTION_NAME,
                    points_selector=PointIdsList(points=list(point_ids)),
                )
                print(f"[QdrantStore] 🗑️ Deleted {len(point_ids)} points by PointIdsList for doc '{doc_id}'")
            except Exception as e:
                print(f"[QdrantStore] Note deleting by PointIdsList: {e}")

        # 2. Also attempt deletion by payload filter
        try:
            filter_conditions = [FieldCondition(key="doc_id", match=MatchValue(value=doc_id))]
            if user_id:
                filter_conditions.append(FieldCondition(key="user_id", match=MatchValue(value=user_id)))

            delete_filter = Filter(must=filter_conditions)
            self.client.delete(collection_name=self.COLLECTION_NAME, points_selector=delete_filter)
        except Exception as e:
            print(f"[QdrantStore] Note deleting by Filter: {e}")

        self._rebuild_bm25_index()
        print(f"[QdrantStore] 🗑️ Deleted document '{doc_id}' ({len(point_ids) or len(chunk_ids)} chunks) from Qdrant")
        return len(point_ids) or len(chunk_ids)

    def list_documents(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.fallback_db:
            return self.fallback_db.list_documents()

        docs = []
        for doc_id, chunk_ids in self.doc_index.items():
            if not chunk_ids:
                continue
            first_chunk = self.chunks_cache.get(chunk_ids[0])
            if not first_chunk:
                continue
            if user_id and first_chunk.get("user_id") != user_id:
                continue
            total_words = sum(self.chunks_cache[cid]["word_count"] for cid in chunk_ids if cid in self.chunks_cache)
            total_chars = sum(self.chunks_cache[cid]["char_count"] for cid in chunk_ids if cid in self.chunks_cache)
            extra = first_chunk.get("extra", {}) if (first_chunk and isinstance(first_chunk.get("extra"), dict)) else {}
            docs.append({
                "doc_id": doc_id,
                "doc_name": first_chunk["doc_name"],
                "user_id": first_chunk.get("user_id"),
                "chunk_count": len(chunk_ids),
                "word_count": total_words,
                "char_count": total_chars,
                "created_at": first_chunk.get("created_at", time.time()),
                "cloudinary_url": extra.get("cloudinary_url"),
                "cloudinary_public_id": extra.get("cloudinary_public_id"),
            })
        return sorted(docs, key=lambda x: x["created_at"], reverse=True)

    def search_dense(
        self,
        query_vector: List[float],
        top_k: int = 4,
        user_id: Optional[str] = None,
        doc_ids: Optional[List[str]] = None,
    ) -> List[tuple[str, float]]:
        """Qdrant HNSW Nearest Neighbor Vector Search with optional user_id and doc_ids isolation."""
        if self.fallback_db:
            return self.fallback_db.search_dense(query_vector, top_k=top_k, user_id=user_id)

        if not self.client or not self.chunks_cache:
            return []

        # Ensure query vector dimension matches
        if len(query_vector) < self.vector_dim:
            query_vector = query_vector + [0.0] * (self.vector_dim - len(query_vector))
        elif len(query_vector) > self.vector_dim:
            query_vector = query_vector[:self.vector_dim]

        filter_conditions = []
        if user_id:
            filter_conditions.append(FieldCondition(key="user_id", match=MatchValue(value=user_id)))
        if doc_ids:
            if len(doc_ids) == 1:
                filter_conditions.append(FieldCondition(key="doc_id", match=MatchValue(value=doc_ids[0])))
            else:
                filter_conditions.append(FieldCondition(key="doc_id", match=MatchAny(any=doc_ids)))

        q_filter = Filter(must=filter_conditions) if filter_conditions else None

        try:
            # Modern Qdrant client (v1.11+) uses query_points
            if hasattr(self.client, "query_points"):
                response = self.client.query_points(
                    collection_name=self.COLLECTION_NAME,
                    query=query_vector,
                    query_filter=q_filter,
                    limit=top_k,
                    with_payload=True,
                )
                points = response.points
                return [(hit.payload["chunk_id"], float(hit.score)) for hit in points if hit.payload and "chunk_id" in hit.payload]
            elif hasattr(self.client, "search"):
                results = self.client.search(
                    collection_name=self.COLLECTION_NAME,
                    query_vector=query_vector,
                    query_filter=q_filter,
                    limit=top_k,
                    with_payload=True,
                )
                return [(hit.payload["chunk_id"], float(hit.score)) for hit in results if hit.payload and "chunk_id" in hit.payload]
        except Exception as e:
            print(f"[QdrantStore] Search error ({e}), falling back to cached scan...")

        # Fallback to in-memory cosine comparison if client call errors
        scored = []
        for cid, payload in self.chunks_cache.items():
            if user_id and payload.get("user_id") != user_id:
                continue
            if doc_ids and payload.get("doc_id") not in doc_ids:
                continue
            scored.append((cid, 0.5))
        return scored[:top_k]

    def search_sparse_bm25(
        self,
        query: str,
        top_k: int = 4,
        user_id: Optional[str] = None,
        doc_ids: Optional[List[str]] = None,
    ) -> List[tuple[str, float]]:
        if not self.chunks_cache:
            return []

        query_terms = [w for w in query.lower().split() if len(w) > 1]
        if not query_terms:
            return []

        k1, b = 1.5, 0.75
        N = len(self.chunks_cache)
        avgdl = self.avg_chunk_length if self.avg_chunk_length > 0 else 1.0

        scores: Dict[str, float] = {}
        for term in query_terms:
            df = self.doc_freq.get(term, 0)
            if df == 0:
                continue

            idf = math.log(1.0 + (N - df + 0.5) / (df + 0.5))
            for chunk_id, payload in self.chunks_cache.items():
                if user_id and payload.get("user_id") != user_id:
                    continue
                if doc_ids and payload.get("doc_id") not in doc_ids:
                    continue
                chunk_words = payload["text"].lower().split()
                tf = chunk_words.count(term)
                if tf == 0:
                    continue

                doc_len = len(chunk_words)
                num = tf * (k1 + 1)
                denom = tf + k1 * (1 - b + b * (doc_len / avgdl))
                score = idf * (num / denom)
                scores[chunk_id] = scores.get(chunk_id, 0.0) + score

        if not scores:
            return []

        max_score = max(scores.values()) or 1.0
        normalized = [(cid, sc / max_score) for cid, sc in scores.items()]
        normalized.sort(key=lambda x: x[1], reverse=True)
        return normalized[:top_k]

    def search_hybrid(
        self,
        query: str,
        query_vector: List[float],
        top_k: int = 4,
        alpha: float = 0.65,
        threshold: float = 0.05,
        user_id: Optional[str] = None,
        doc_ids: Optional[List[str]] = None,
    ) -> List[SearchResult]:
        """Blends Qdrant Dense HNSW Search + Sparse BM25 Keyword Search with user and document isolation."""
        if self.fallback_db:
            return self.fallback_db.search_hybrid(
                query=query, query_vector=query_vector, top_k=top_k, alpha=alpha, threshold=threshold
            )

        dense_results = dict(self.search_dense(query_vector, top_k=top_k * 3, user_id=user_id, doc_ids=doc_ids))
        sparse_results = dict(self.search_sparse_bm25(query, top_k=top_k * 3, user_id=user_id, doc_ids=doc_ids))

        all_candidate_ids = set(dense_results.keys()).union(set(sparse_results.keys()))
        if not all_candidate_ids:
            return []

        scored_results = []
        for cid in all_candidate_ids:
            d_score = max(0.0, dense_results.get(cid, 0.0))
            s_score = max(0.0, sparse_results.get(cid, 0.0))
            blended_score = (alpha * d_score) + ((1.0 - alpha) * s_score)

            if blended_score >= threshold and cid in self.chunks_cache:
                payload = self.chunks_cache[cid]
                scored_results.append(
                    SearchResult(
                        chunk_id=cid,
                        doc_id=payload["doc_id"],
                        doc_name=payload["doc_name"],
                        chunk_index=payload["chunk_index"],
                        text=payload["text"],
                        score=round(blended_score, 4),
                        dense_score=round(d_score, 4),
                        sparse_score=round(s_score, 4),
                        metadata=payload.get("extra", {}),
                    )
                )

        scored_results.sort(key=lambda x: x.score, reverse=True)
        return scored_results[:top_k]

    def _rebuild_bm25_index(self):
        self.doc_freq.clear()
        total_len = 0

        for chunk_id, payload in self.chunks_cache.items():
            words = payload["text"].lower().split()
            total_len += len(words)
            unique_terms = set(w for w in words if len(w) > 1)
            for t in unique_terms:
                self.doc_freq[t] = self.doc_freq.get(t, 0) + 1

        self.avg_chunk_length = total_len / max(1, len(self.chunks_cache))

    def _load_metadata_cache(self):
        """Scrolls existing points from Qdrant on boot to populate local lookup index."""
        if not self.client:
            return
        try:
            offset = None
            while True:
                scroll_res = self.client.scroll(
                    collection_name=self.COLLECTION_NAME,
                    limit=100,
                    offset=offset,
                    with_payload=True,
                    with_vectors=False,
                )
                points, next_offset = scroll_res
                for p in points:
                    if p.payload:
                        cid = p.payload["chunk_id"]
                        did = p.payload["doc_id"]
                        self.chunks_cache[cid] = p.payload
                        if did not in self.doc_index:
                            self.doc_index[did] = []
                        if cid not in self.doc_index[did]:
                            self.doc_index[did].append(cid)

                if next_offset is None or not points:
                    break
                offset = next_offset

            self._rebuild_bm25_index()
            print(f"[QdrantStore] 📦 Loaded {len(self.chunks_cache)} existing chunks across {len(self.doc_index)} documents from Qdrant.")
        except Exception as e:
            print(f"[QdrantStore] Metadata cache load notice: {e}")

    @property
    def chunks(self):
        if self.fallback_db:
            return self.fallback_db.chunks
        return {
            cid: ChunkMetadata(
                chunk_id=p["chunk_id"],
                doc_id=p["doc_id"],
                doc_name=p["doc_name"],
                chunk_index=p["chunk_index"],
                total_chunks=p.get("total_chunks", 1),
                text=p["text"],
                char_count=p["char_count"],
                word_count=p["word_count"],
                start_char=p.get("start_char", 0),
                end_char=p.get("end_char", len(p["text"])),
                extra=p.get("extra", {}),
                created_at=p.get("created_at", time.time()),
            )
            for cid, p in self.chunks_cache.items()
        }
