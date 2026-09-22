"""
Unit and Integration Tests for AI Knowledge Assistant (RAG + Vector DB).
"""

import unittest
import os
import shutil
from backend.rag.chunker import RecursiveChunker
from backend.rag.embeddings import EmbeddingEngine
from backend.rag.vector_store import VectorDatabase
from backend.rag.pipeline import RAGPipeline


class TestRAGComponents(unittest.TestCase):
    def setUp(self):
        self.test_storage_path = "data/test_vector_store.json"
        self.chunker = RecursiveChunker(chunk_size=150, chunk_overlap=30)
        self.embeddings = EmbeddingEngine(provider="local_semantic")
        self.vector_db = VectorDatabase(storage_path=self.test_storage_path)
        self.pipeline = RAGPipeline(
            vector_db=self.vector_db,
            embedding_engine=self.embeddings,
            chunk_size=150,
            chunk_overlap=30,
        )

    def tearDown(self):
        if os.path.exists(self.test_storage_path):
            os.remove(self.test_storage_path)

    def test_recursive_chunker(self):
        text = (
            "Retrieval-Augmented Generation (RAG) optimizes the output of Large Language Models. "
            "It references an authoritative external knowledge base outside of training data. "
            "Vectors represent dense mathematical concepts in continuous hyperspace."
        )
        chunks = self.chunker.split_text(text)
        self.assertTrue(len(chunks) >= 2)
        for c in chunks:
            self.assertLessEqual(len(c), 150)

    def test_embedding_cosine_similarity(self):
        v1 = self.embeddings.embed_query("artificial intelligence machine learning")
        v2 = self.embeddings.embed_query("deep learning neural networks AI")
        v3 = self.embeddings.embed_query("baking chocolate cake in kitchen oven")

        # Compute dot product (since vectors are L2-normalized)
        sim_related = sum(a * b for a, b in zip(v1, v2))
        sim_unrelated = sum(a * b for a, b in zip(v1, v3))

        self.assertGreater(sim_related, sim_unrelated)

    def test_vector_store_and_hybrid_search(self):
        doc_text_1 = "The Transformer model relies on multi-head self-attention mechanisms for sequence processing."
        doc_text_2 = "Gradient descent is an optimization algorithm used to minimize loss functions in neural networks."

        self.pipeline.ingest_document(doc_id="doc1", doc_name="transformers.txt", text=doc_text_1)
        self.pipeline.ingest_document(doc_id="doc2", doc_name="optimization.txt", text=doc_text_2)

        # Query related to Transformers
        results = self.pipeline.retrieve(query="How does self-attention work in Transformers?", top_k=2)
        self.assertTrue(len(results) > 0)
        self.assertEqual(results[0].doc_name, "transformers.txt")
        self.assertGreater(results[0].score, 0.2)

    def test_end_to_end_rag_answering(self):
        doc_text = "NexusRAG uses Cosine Similarity and Okapi BM25 for hybrid reciprocal rank fusion."
        self.pipeline.ingest_document(doc_id="test_rag_doc", doc_name="nexus_rag.md", text=doc_text)

        response = self.pipeline.answer_query(query="What algorithms does NexusRAG use for retrieval?", top_k=2)
        self.assertIn("answer", response)
        self.assertTrue(len(response["citations"]) > 0)
        self.assertGreater(response["confidence_score"], 0.0)


if __name__ == "__main__":
    unittest.main()
