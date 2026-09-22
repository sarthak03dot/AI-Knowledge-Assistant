# The Transformer Architecture in Modern AI

## 1. Introduction & Background
Introduced in the seminal 2017 paper *"Attention Is All You Need"* by Vaswani et al., the Transformer architecture replaced recurrent neural networks (RNNs) and LSTMs as the dominant architecture for natural language processing and computer vision.

The primary innovation of the Transformer is the **Self-Attention Mechanism**, which allows the model to process all tokens in a sequence concurrently (in parallel) and weigh the contextual relevance of all other tokens regardless of their distance in the text.

## 2. Core Building Blocks

1. **Positional Encoding**:
   Because Transformers process tokens in parallel rather than sequentially, positional encodings (sinusoidal functions or learned embeddings) are injected into the input embeddings to provide token order information.

2. **Scaled Dot-Product Attention**:
   Attention computes three matrices from the inputs: Queries ($Q$), Keys ($K$), and Values ($V$).
   $$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$
   The scaling factor $\sqrt{d_k}$ prevents dot products from growing excessively large for high dimensions, preventing vanishing gradients in the softmax.

3. **Multi-Head Attention**:
   Instead of computing a single attention function, Multi-Head Attention projects $Q$, $K$, and $V$ multiple times into lower-dimensional subspaces. This enables the model to simultaneously attend to information from different representation subspaces at different positions (e.g., grammatical structure, semantic role, coreference).

4. **Feed-Forward Networks (FFN)**:
   Each layer contains a fully connected feed-forward network applied to each position independently and identically, consisting of two linear transformations with a non-linear activation (such as GELU or SwiGLU).

5. **Residual Connections & Layer Normalization**:
   Add & Norm layers surround each sub-layer, stabilizing deep network gradient propagation.
