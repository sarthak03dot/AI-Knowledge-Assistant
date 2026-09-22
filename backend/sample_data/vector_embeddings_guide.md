# Understanding Vector Embeddings & Vector Databases

## 1. What are Vector Embeddings?
Vector embeddings are numerical representations of concepts, words, sentences, or images converted into dense arrays of real numbers (vectors) in a multi-dimensional continuous space.

Unlike traditional keyword indexes that only match identical words (e.g., searching "automobile" will not match "car"), vector embeddings capture the underlying **semantic meaning** of text. In embedding space:
- Related concepts (like "king" and "queen", or "puppy" and "dog") are situated close to each other.
- The distance between vectors corresponds directly to their semantic relationship.

## 2. Distance Metrics for Vector Similarity

To determine how similar two embedding vectors $\vec{A}$ and $\vec{B}$ are, vector databases utilize geometric distance metrics:

1. **Cosine Similarity**:
   Measures the cosine of the angle between two non-zero vectors. It focuses purely on orientation rather than magnitude.
   $$\text{Cosine Similarity}(\vec{A}, \vec{B}) = \frac{\vec{A} \cdot \vec{B}}{\|\vec{A}\| \|\vec{B}\|}$$
   Values range from -1 (opposite) to 1 (identical meaning). A similarity score above 0.75 typically indicates strong semantic alignment.

2. **Euclidean Distance (L2 Distance)**:
   Measures the straight-line distance between two points in Euclidean space.
   $$d(\vec{A}, \vec{B}) = \sqrt{\sum_{i=1}^n (A_i - B_i)^2}$$
   Lower values indicate closer similarity.

3. **Dot Product (Inner Product)**:
   Measures the projection of one vector onto another. When vectors are L2-normalized (length = 1.0), the dot product is mathematically identical to cosine similarity.

## 3. Why Hybrid Search is Essential
While dense vector search is exceptional at conceptual and thematic matching, it can sometimes struggle with:
- Exact part numbers or SKU codes (e.g., `SKU-8921-X`)
- Rare acronyms, specialized medical terms, or proper names

By pairing **Dense Vector Retrieval** (semantic context) with **BM25 / TF-IDF** (exact keyword matching) using Reciprocal Rank Fusion, hybrid search delivers the highest retrieval accuracy across all query types.
