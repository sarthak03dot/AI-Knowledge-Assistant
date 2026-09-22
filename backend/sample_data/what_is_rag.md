# Retrieval-Augmented Generation (RAG) Explained

## 1. What is RAG?
Retrieval-Augmented Generation (RAG) is an AI architectural pattern that optimizes the output of a Large Language Model (LLM) by referencing an authoritative, external knowledge base outside of its training data before generating a response.

LLMs are trained on vast volumes of data and use billions of parameters to generate original output for tasks like answering questions, translating languages, and completing sentences. However, standard LLMs suffer from two primary limitations:
1. **Knowledge Cutoff**: They cannot access private company data or real-time information updated after their pre-training date.
2. **Hallucinations**: When asked about specific or unknown facts, LLMs may fabricate plausible-sounding but incorrect information.

RAG solves these problems by retrieving relevant information from an external vector database and inserting it directly into the LLM prompt context.

## 2. The Core Components of a RAG System

A production RAG pipeline consists of three sequential phases:

### Phase A: Document Ingestion & Vectorization
- **Parsing**: Raw documents (PDF, TXT, Markdown, HTML, Word) are converted to clean, normalized text.
- **Chunking**: The document is split into smaller, semantically coherent segments (typically 200 to 1,000 characters) with 10-20% overlap.
- **Embedding**: An embedding model converts each text chunk into a high-dimensional dense vector representation.
- **Indexing**: Vectors and chunk metadata (source file, chunk index, timestamps) are stored in a vector database (such as ChromaDB, Pinecone, or pgvector).

### Phase B: Retrieval & Reranking
- When a user submits a query, the query is converted into an embedding vector using the same embedding model.
- **Dense Vector Search**: The vector store calculates the Cosine Similarity or Dot Product between the query vector and all stored chunk vectors to find the nearest neighbors.
- **Hybrid Search**: Dense semantic search is combined with sparse BM25 keyword search to ensure both conceptual understanding and exact keyword/acronym matching.
- **Reranking**: A cross-encoder or reciprocal rank fusion (RRF) algorithm scores and reranks the candidate chunks to select the top-K most relevant passages.

### Phase C: Augmented Generation
- The top-K retrieved chunks are formatted into a system prompt.
- The prompt instructs the LLM: *"Answer the user query using strictly the retrieved context below. Cite your sources with [1], [2] brackets."*
- The LLM synthesizes a concise, grounded answer with verifiable source attributions.
