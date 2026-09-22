"""
Multi-Provider Vector Embedding Engine with Full Fallback Hierarchy.
"""

import os
import math
import hashlib
from typing import List, Optional
import httpx


class EmbeddingEngine:
    DIMENSION = 768

    def __init__(
        self,
        provider: str = "auto",
        gemini_api_key: Optional[str] = None,
        openrouter_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None,
    ):
        self.gemini_api_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        self.openrouter_api_key = openrouter_api_key or os.getenv("OPENROUTER_API_KEY")
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")

        if provider == "auto":
            if self.openrouter_api_key:
                self.provider = "openrouter"
            elif self.gemini_api_key:
                self.provider = "gemini"
            else:
                self.provider = "local_semantic"
        else:
            self.provider = provider

    def embed_query(self, query: str) -> List[float]:
        results = self.embed_texts([query])
        return results[0] if results else [0.0] * self.DIMENSION

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        # 1. Try OpenRouter Embeddings
        if self.openrouter_api_key:
            try:
                embeddings = self._embed_openrouter(texts)
                if embeddings and len(embeddings) == len(texts):
                    return embeddings
            except Exception:
                pass

        # 2. Try Gemini Embeddings
        if self.gemini_api_key:
            for model_slug in ["text-embedding-004", "embedding-001"]:
                try:
                    embeddings = self._embed_gemini(texts, model=model_slug)
                    if embeddings and len(embeddings) == len(texts):
                        return embeddings
                except Exception:
                    pass

        # 3. Final Fallback: Fast Local Normalized Semantic Vectorizer
        return [self._local_semantic_embed(t) for t in texts]

    def _embed_openrouter(self, texts: List[str]) -> List[List[float]]:
        url = "https://openrouter.ai/api/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "NexusRAG Knowledge Assistant",
        }
        with httpx.Client(timeout=12.0) as client:
            resp = client.post(
                url,
                headers=headers,
                json={"input": texts, "model": "openai/text-embedding-3-small"},
            )
            resp.raise_for_status()
            data = resp.json()
            return [item["embedding"] for item in data.get("data", [])]

    def _embed_gemini(self, texts: List[str], model: str = "text-embedding-004") -> List[List[float]]:
        if self.gemini_api_key.startswith("AQ."):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents"
            headers = {"Authorization": f"Bearer {self.gemini_api_key}", "Content-Type": "application/json"}
        else:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents?key={self.gemini_api_key}"
            headers = {"Content-Type": "application/json"}

        requests_payload = [
            {"model": f"models/{model}", "content": {"parts": [{"text": t}]}}
            for t in texts
        ]
        with httpx.Client(timeout=12.0) as client:
            resp = client.post(url, headers=headers, json={"requests": requests_payload})
            if resp.status_code == 200:
                data = resp.json()
                return [item["values"] for item in data.get("embeddings", [])]
            raise ValueError(f"Gemini embed status: {resp.status_code}")

    def _local_semantic_embed(self, text: str) -> List[float]:
        dim = self.DIMENSION
        vector = [0.0] * dim

        if not text or not text.strip():
            return vector

        cleaned = text.lower().strip()
        words = [w for w in re_tokenize(cleaned) if len(w) > 1]

        for pos, word in enumerate(words):
            pos_weight = 1.0 / math.sqrt(pos + 1)
            h = int(hashlib.sha256(word.encode("utf-8")).hexdigest(), 16)
            slot1 = h % dim
            slot2 = (h >> 16) % dim
            sign1 = 1.0 if (h & 1) else -1.0
            sign2 = 1.0 if (h & 2) else -1.0

            vector[slot1] += 2.0 * sign1 * pos_weight
            vector[slot2] += 1.0 * sign2 * pos_weight

        for i in range(len(cleaned) - 2):
            trigram = cleaned[i : i + 3]
            h = int(hashlib.md5(trigram.encode("utf-8")).hexdigest(), 16)
            slot = h % dim
            sign = 1.0 if (h & 1) else -1.0
            vector[slot] += 0.5 * sign

        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 1e-9:
            vector = [v / norm for v in vector]

        return vector


def re_tokenize(text: str) -> List[str]:
    import re
    return re.findall(r"\b\w+\b", text.lower())
