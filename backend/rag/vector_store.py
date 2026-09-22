"""
Persistent Vector Database & Hybrid Search Engine.

What this module does:
1. Stores chunk vectors with document metadata.
2. Computes Cosine Similarity between query vectors and stored chunk vectors.
3. Maintains an inverted keyword index for BM25 term matching.
4. Performs Hybrid Search combining Dense Vector Retrieval with Sparse BM25 via Reciprocal Rank Fusion (RRF).
5. Persists index and metadata to disk.
"""

import os
import json
import math
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import numpy as np


@dataclass
class ChunkMetadata:
    chunk_id: str
    doc_id: str
    doc_name: str
    chunk_index: int
    total_chunks: int
    text: str
    char_count: int
    word_count: int
    start_char: int
    end_char: int
    extra: Dict[str, Any]
    created_at: float


@dataclass
class SearchResult:
    chunk_id: str
    doc_id: str
    doc_name: str
    chunk_index: int
    text: str
    score: float  # Final blended score [0, 1]
    dense_score: float  # Cosine similarity
    sparse_score: float  # BM25 / Keyword score
    metadata: Dict[str, Any]


class VectorDatabase:
    def __init__(self, storage_path: str = "data/vector_store.json"):
        self.storage_path = storage_path
        self.chunks: Dict[str, ChunkMetadata] = {}
        self.vectors: Dict[str, List[float]] = {}  # chunk_id -> vector
        self.doc_index: Dict[str, List[str]] = {}  # doc_id -> list of chunk_ids
        
        # Sparse BM25 stats
        self.doc_freq: Dict[str, int] = {}  # word -> number of chunks containing word
        self.chunk_lengths: Dict[str, int] = {}  # chunk_id -> word count
        self.avg_chunk_length: float = 0.0

        self._ensure_storage_dir()
        self.load()

    def _ensure_storage_dir(self):
        dir_path = os.path.dirname(self.storage_path)
        if dir_path and not os.path.exists(dir_path):
            os.makedirs(dir_path, exist_ok=True)

    def add_chunks(self, chunk_dicts: List[Dict[str, Any]], embeddings: List[List[float]]):
        """Add a batch of chunks and their corresponding embedding vectors to the index."""
        if len(chunk_dicts) != len(embeddings):
            raise ValueError("Number of chunks and embeddings must match.")

        for chunk_data, vec in zip(chunk_dicts, embeddings):
            chunk_id = chunk_data["chunk_id"]
            doc_id = chunk_data["doc_id"]

            meta = ChunkMetadata(
                chunk_id=chunk_id,
                doc_id=doc_id,
                doc_name=chunk_data.get("doc_name", "untitled"),
                chunk_index=chunk_data.get("chunk_index", 0),
                total_chunks=chunk_data.get("total_chunks", 1),
                text=chunk_data["text"],
                char_count=chunk_data.get("char_count", len(chunk_data["text"])),
                word_count=chunk_data.get("word_count", len(chunk_data["text"].split())),
                start_char=chunk_data.get("start_char", 0),
                end_char=chunk_data.get("end_char", len(chunk_data["text"])),
                extra=chunk_data.get("extra", {}),
                created_at=time.time(),
            )

            self.chunks[chunk_id] = meta
            self.vectors[chunk_id] = vec

            if doc_id not in self.doc_index:
                self.doc_index[doc_id] = []
            if chunk_id not in self.doc_index[doc_id]:
                self.doc_index[doc_id].append(chunk_id)

        self._rebuild_bm25_index()
        self.save()

    def delete_document(self, doc_id: str) -> int:
        if doc_id not in self.doc_index:
            return 0

        chunk_ids = self.doc_index.pop(doc_id)
        for cid in chunk_ids:
            self.chunks.pop(cid, None)
            self.vectors.pop(cid, None)

        self._rebuild_bm25_index()
        self.save()
        return len(chunk_ids)

    def list_documents(self) -> List[Dict[str, Any]]:
        docs = []
        for doc_id, chunk_ids in self.doc_index.items():
            if not chunk_ids:
                continue
            first_chunk = self.chunks.get(chunk_ids[0])
            total_words = sum(self.chunks[cid].word_count for cid in chunk_ids if cid in self.chunks)
            total_chars = sum(self.chunks[cid].char_count for cid in chunk_ids if cid in self.chunks)
            docs.append({
                "doc_id": doc_id,
                "doc_name": first_chunk.doc_name if first_chunk else "Unknown",
                "chunk_count": len(chunk_ids),
                "word_count": total_words,
                "char_count": total_chars,
                "created_at": first_chunk.created_at if first_chunk else time.time(),
                "cloudinary_url": first_chunk.extra.get("cloudinary_url") if (first_chunk and isinstance(first_chunk.extra, dict)) else None,
                "cloudinary_public_id": first_chunk.extra.get("cloudinary_public_id") if (first_chunk and isinstance(first_chunk.extra, dict)) else None,
            })
        return sorted(docs, key=lambda x: x["created_at"], reverse=True)

    def search_dense(
        self,
        query_vector: List[float],
        top_k: int = 4,
        user_id: Optional[str] = None,
        doc_ids: Optional[List[str]] = None,
    ) -> List[tuple[str, float]]:
        """
        Cosine Similarity search across stored vectors with dimension tolerance.
        """
        if not self.vectors:
            return []

        q_vec = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm < 1e-9:
            return []
        q_vec = q_vec / q_norm
        q_dim = len(q_vec)

        scored = []
        for cid, vec in self.vectors.items():
            meta = self.chunks.get(cid)
            if user_id and meta and meta.extra.get("user_id") != user_id:
                continue
            if doc_ids and meta and meta.doc_id not in doc_ids:
                continue
            # Pad or truncate if dimensions differ due to model switching
            v_arr = np.array(vec, dtype=np.float32)
            if len(v_arr) < q_dim:
                v_arr = np.pad(v_arr, (0, q_dim - len(v_arr)))
            elif len(v_arr) > q_dim:
                v_arr = v_arr[:q_dim]

            v_norm = np.linalg.norm(v_arr)
            if v_norm > 1e-9:
                v_arr = v_arr / v_norm
                sim = float(np.dot(q_vec, v_arr))
                scored.append((cid, sim))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def search_sparse_bm25(
        self,
        query: str,
        top_k: int = 4,
        user_id: Optional[str] = None,
        doc_ids: Optional[List[str]] = None,
    ) -> List[tuple[str, float]]:
        if not self.chunks:
            return []

        query_terms = [w for w in query.lower().split() if len(w) > 1]
        if not query_terms:
            return []

        k1, b = 1.5, 0.75
        N = len(self.chunks)
        avgdl = self.avg_chunk_length if self.avg_chunk_length > 0 else 1.0

        scores: Dict[str, float] = {}

        for term in query_terms:
            df = self.doc_freq.get(term, 0)
            if df == 0:
                continue

            idf = math.log(1.0 + (N - df + 0.5) / (df + 0.5))

            for chunk_id, meta in self.chunks.items():
                if user_id and meta.extra.get("user_id") != user_id:
                    continue
                if doc_ids and meta.doc_id not in doc_ids:
                    continue
                chunk_words = meta.text.lower().split()
                tf = chunk_words.count(term)
                if tf == 0:
                    continue

                doc_len = len(chunk_words)
                numerator = tf * (k1 + 1)
                denominator = tf + k1 * (1 - b + b * (doc_len / avgdl))
                score = idf * (numerator / denominator)
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

            if blended_score >= threshold and cid in self.chunks:
                meta = self.chunks[cid]
                scored_results.append(
                    SearchResult(
                        chunk_id=cid,
                        doc_id=meta.doc_id,
                        doc_name=meta.doc_name,
                        chunk_index=meta.chunk_index,
                        text=meta.text,
                        score=round(blended_score, 4),
                        dense_score=round(d_score, 4),
                        sparse_score=round(s_score, 4),
                        metadata=meta.extra,
                    )
                )

        scored_results.sort(key=lambda x: x.score, reverse=True)
        return scored_results[:top_k]

    def _rebuild_bm25_index(self):
        self.doc_freq.clear()
        self.chunk_lengths.clear()
        total_len = 0

        for chunk_id, meta in self.chunks.items():
            words = meta.text.lower().split()
            self.chunk_lengths[chunk_id] = len(words)
            total_len += len(words)

            unique_terms = set(w for w in words if len(w) > 1)
            for t in unique_terms:
                self.doc_freq[t] = self.doc_freq.get(t, 0) + 1

        self.avg_chunk_length = total_len / max(1, len(self.chunks))

    def save(self):
        data = {
            "chunks": {cid: asdict(meta) for cid, meta in self.chunks.items()},
            "vectors": self.vectors,
            "doc_index": self.doc_index,
        }
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load(self):
        if not os.path.exists(self.storage_path):
            return

        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            self.chunks = {
                cid: ChunkMetadata(**meta) for cid, meta in data.get("chunks", {}).items()
            }
            self.vectors = data.get("vectors", {})
            self.doc_index = data.get("doc_index", {})
            self._rebuild_bm25_index()
        except Exception as e:
            print(f"[VectorDatabase] Failed to load store from {self.storage_path}: {e}")
