# AI Engineer — Complete 12-Month Roadmap

> A practical roadmap from software engineer/full-stack developer to production-ready AI Engineer.
>
> **Target:** Build strong foundations in ML/DL, become highly capable with LLMs/RAG/Agents, learn AI infrastructure, and finish with a portfolio that can support AI Engineer / ML Engineer applications.

---

## 1. Roadmap Overview

### Final capability

By the end of this roadmap, you should be able to:

- Build machine-learning models with Python and scikit-learn.
- Understand the mathematics behind common ML and deep-learning techniques.
- Build and train neural networks with PyTorch.
- Understand transformers, attention, tokenization, embeddings, and LLM inference.
- Build production RAG applications.
- Build tool-using AI agents.
- Evaluate LLM and RAG systems instead of relying only on subjective testing.
- Serve AI systems through APIs.
- Use PostgreSQL/pgvector, Redis, Docker, queues, and cloud infrastructure.
- Understand GPU/inference fundamentals.
- Deploy AI applications.
- Design complete AI architectures.
- Explain your projects clearly in technical interviews.
- Maintain a GitHub portfolio demonstrating real engineering ability.

---

# 2. Your Starting Position

You already have useful software-engineering experience in areas such as:

- React + TypeScript
- Node.js/Express
- Python
- PostgreSQL
- MongoDB
- Redis
- Docker
- REST APIs
- Authentication/JWT
- Git
- Cloud/deployment concepts
- React Native
- Local LLM usage with Ollama

Therefore, **do not spend months relearning ordinary web development**.

Your main learning gap is:

```text
Python for AI
        ↓
Mathematics
        ↓
Machine Learning
        ↓
Deep Learning
        ↓
Transformers
        ↓
LLMs
        ↓
RAG
        ↓
Agents
        ↓
Evaluation
        ↓
AI Infrastructure
        ↓
Production AI
```

---

# 3. Technology Stack

Use a relatively small stack.

## Core

- Python 3.11+
- Git/GitHub
- Linux/terminal
- VS Code
- Jupyter

## Data / ML

- NumPy
- Pandas
- Matplotlib
- scikit-learn
- XGBoost

## Deep Learning

- PyTorch
- torchvision
- Hugging Face Transformers
- Hugging Face Datasets

## LLM Engineering

- LLM APIs
- Open-source models
- Ollama
- Tokenizers
- Embeddings
- Structured outputs
- Tool/function calling

## RAG

- PostgreSQL
- pgvector
- FAISS for experiments
- Chunking/retrieval techniques
- Reranking

## Backend

- FastAPI
- Pydantic
- Async Python
- REST APIs
- WebSockets where appropriate

## Production

- Docker
- Redis
- Background jobs/queues
- Logging
- Monitoring
- Cloud deployment
- CI/CD

## Frontend

Continue using:

- React
- TypeScript
- Vite
- MUI

You already know this area.

---

# 4. Study Strategy

Use this rule:

```text
30% Learning
70% Building
```

For every major topic:

```text
Learn concept
    ↓
Implement small example
    ↓
Build mini-project
    ↓
Build production-style project
    ↓
Document it
    ↓
Put it on GitHub
```

Do not spend months watching courses without building.

---

# 5. 12-Month Roadmap

## Phase 0 — Environment Setup

### Duration

2–3 days

### Install

```bash
python3 --version
git --version
docker --version
```

Create an AI workspace:

```text
ai-engineering/
├── 01-python/
├── 02-math/
├── 03-ml/
├── 04-deep-learning/
├── 05-nlp/
├── 06-transformers/
├── 07-llm/
├── 08-rag/
├── 09-agents/
├── 10-evaluation/
├── 11-mlops/
└── projects/
```

Create a GitHub repository for notes and experiments.

---

# Phase 1 — Python for AI

## Duration

Weeks 1–3

## Goal

Become comfortable enough with Python to implement AI systems without fighting the language.

## Topics

### Python fundamentals

Learn:

- Variables
- Data types
- Lists
- Tuples
- Sets
- Dictionaries
- Loops
- Conditions
- Functions
- Lambda
- Comprehensions
- Exceptions
- File handling
- Modules
- Packages

### Intermediate Python

Learn:

- Classes
- Dataclasses
- Inheritance
- Iterators
- Generators
- Decorators
- Context managers
- Type hints
- `typing`
- `pathlib`
- `logging`
- `json`
- `datetime`
- Environment variables

### AI-oriented Python

Learn:

- Virtual environments
- Dependency management
- Async/await
- HTTP clients
- API calls
- Serialization
- CLI applications
- Testing with pytest

## Libraries

```text
numpy
pandas
matplotlib
jupyter
requests/httpx
pydantic
pytest
```

## Mini-projects

### Project 1

CSV Data Analyzer

Input:

```text
sales.csv
```

Output:

- Total sales
- Average sales
- Top products
- Monthly statistics
- Charts

### Project 2

API Data Pipeline

```text
REST API
   ↓
Python
   ↓
Transform
   ↓
PostgreSQL
```

### Project 3

CLI AI Utility

Build a command-line tool that sends prompts to a local Ollama model.

---

# Phase 2 — Mathematics for Machine Learning

## Duration

Weeks 4–7

Do not try to become a mathematician.

Learn the mathematics needed to understand ML.

---

## 2.1 Linear Algebra

Learn:

- Scalars
- Vectors
- Matrices
- Tensors
- Dot product
- Matrix multiplication
- Transpose
- Norms
- Linear transformations
- Eigenvalues
- Eigenvectors
- Dimensionality reduction

Understand why:

```text
text
 ↓
embedding
 ↓
vector
```

and why vectors can be compared using similarity.

### Practice

Implement manually:

```python
dot_product()
cosine_similarity()
matrix_multiply()
```

---

## 2.2 Probability

Learn:

- Probability
- Conditional probability
- Bayes theorem
- Random variables
- Probability distributions
- Expected value
- Variance
- Standard deviation

---

## 2.3 Statistics

Learn:

- Mean
- Median
- Mode
- Variance
- Standard deviation
- Correlation
- Sampling
- Confidence intervals
- Hypothesis testing
- Data distributions

---

## 2.4 Calculus

Focus on:

- Functions
- Derivatives
- Partial derivatives
- Gradients
- Chain rule
- Optimization

Understand:

```text
Prediction
    ↓
Loss
    ↓
Gradient
    ↓
Parameter update
    ↓
Better model
```

---

## 2.5 Optimization

Learn:

- Gradient descent
- Learning rate
- Local/global minima
- SGD
- Momentum
- Adam

### Mini-project

Implement linear regression from scratch using NumPy.

Then implement gradient descent yourself.

---

# Phase 3 — Classical Machine Learning

## Duration

Weeks 8–12

This phase teaches you how machine learning actually works.

---

## 3.1 ML Workflow

Learn:

```text
Problem
 ↓
Data
 ↓
Cleaning
 ↓
Features
 ↓
Train/Validation/Test
 ↓
Model
 ↓
Evaluation
 ↓
Deployment
```

---

## 3.2 Data Preparation

Learn:

- Missing values
- Outliers
- Encoding
- Scaling
- Normalization
- Feature engineering
- Data leakage
- Train/test splitting

---

## 3.3 Supervised Learning

Learn and implement:

### Regression

- Linear Regression
- Ridge
- Lasso
- Random Forest Regressor
- Gradient Boosting

### Classification

- Logistic Regression
- Decision Trees
- Random Forest
- Gradient Boosting
- XGBoost
- KNN
- SVM

---

## 3.4 Unsupervised Learning

Learn:

- K-Means
- DBSCAN
- PCA
- Clustering
- Dimensionality reduction

---

## 3.5 Evaluation

Regression:

- MAE
- MSE
- RMSE
- R²

Classification:

- Accuracy
- Precision
- Recall
- F1
- ROC-AUC
- Confusion matrix

Learn why accuracy can be misleading for imbalanced datasets.

---

## Project 1 — Customer Churn Prediction

Build:

```text
Customer Data
      ↓
Data Cleaning
      ↓
Feature Engineering
      ↓
Train ML Model
      ↓
Evaluate
      ↓
FastAPI
      ↓
React Dashboard
```

Features:

- CSV upload
- Prediction API
- Probability
- Evaluation metrics
- Charts
- Model version

### GitHub requirements

Include:

```text
README.md
architecture.png
requirements.txt
src/
tests/
notebooks/
Dockerfile
```

---

# Phase 4 — Deep Learning

## Duration

Months 4–5

Now learn neural networks properly.

---

# 4.1 Neural Network Fundamentals

Learn:

- Neurons
- Layers
- Weights
- Bias
- Activation functions
- Forward propagation
- Loss functions
- Backpropagation
- Gradient descent

Activation functions:

- ReLU
- Sigmoid
- Tanh
- Softmax

Loss functions:

- MSE
- Binary cross entropy
- Cross entropy

---

# 4.2 PyTorch

Learn:

- Tensors
- Dataset
- DataLoader
- Model
- Module
- Optimizer
- Loss
- Training loop
- Validation loop
- GPU/CPU
- Checkpoints
- Model serialization

Build a training loop yourself.

```text
for epoch:
    train
    calculate loss
    backward
    optimizer step
    validate
```

---

# 4.3 CNNs

Learn:

- Convolution
- Filters
- Feature maps
- Pooling
- Stride
- Padding
- CNN architecture

---

## Project 2 — Image Classification

Build:

**Product/Image Classifier**

Requirements:

- Dataset pipeline
- Augmentation
- CNN/transfer learning
- Training
- Validation
- Confusion matrix
- Model API
- Docker deployment

---

# Phase 5 — NLP Fundamentals

## Duration

Weeks 21–24

Before jumping deeply into LLMs, understand NLP.

Learn:

- Text normalization
- Tokenization
- Stop words
- Stemming
- Lemmatization
- Bag of Words
- TF-IDF
- N-grams
- Word embeddings
- Semantic similarity

Understand the evolution:

```text
Bag of Words
    ↓
TF-IDF
    ↓
Word2Vec
    ↓
RNN
    ↓
LSTM
    ↓
Attention
    ↓
Transformer
    ↓
LLM
```

---

# Phase 6 — Transformers

## Duration

Weeks 25–28

This is one of the most important phases.

---

## Learn

### Tokenization

Understand:

```text
Text
 ↓
Tokens
 ↓
Token IDs
```

Learn why tokenization affects:

- Cost
- Context length
- Latency
- Model behavior

---

## Embeddings

Understand:

```text
Token
 ↓
Embedding
 ↓
Vector
```

---

## Attention

Learn:

- Query
- Key
- Value
- Attention scores
- Softmax
- Self-attention
- Multi-head attention

Understand conceptually:

```text
Q × Kᵀ
   ↓
Attention scores
   ↓
Softmax
   ↓
Weighted V
```

---

## Transformer Architecture

Learn:

- Embedding
- Positional information
- Attention
- Feed-forward network
- Residual connections
- Layer normalization
- Encoder
- Decoder

---

## Project 3 — Mini Transformer

Do not build a giant LLM.

Build a tiny transformer in PyTorch.

Goal:

```text
Text
 ↓
Tokenizer
 ↓
Embedding
 ↓
Self Attention
 ↓
Transformer Blocks
 ↓
Output
```

The purpose is understanding, not production quality.

---

# Phase 7 — LLM Engineering

## Duration

Months 7–8

Now move into modern AI application development.

---

# 7.1 LLM Fundamentals

Learn:

- Parameters
- Context window
- Tokens
- Inference
- Temperature
- Top-p
- System/user messages
- Structured output
- Streaming
- Function/tool calling

Understand:

```text
Prompt
 ↓
Tokenizer
 ↓
Model
 ↓
Next-token probabilities
 ↓
Generated tokens
```

---

# 7.2 Model Types

Understand the difference between:

- Base models
- Instruction-tuned models
- Chat models
- Reasoning-oriented models
- Embedding models
- Reranking models
- Multimodal models

---

# 7.3 Local LLMs

Use Ollama for local experimentation.

Learn:

- Pulling models
- Running models
- API usage
- Streaming
- Model configuration
- Quantization concepts
- CPU vs GPU inference

Because your Mac has limited RAM, start with smaller models.

---

# 7.4 Prompt Engineering

Learn:

- Clear instructions
- Context
- Few-shot examples
- Output schemas
- Constraints
- Role separation
- Prompt injection awareness

Don't treat prompting as the whole AI engineering discipline.

---

# Project 4 — Production-Style AI Chatbot

Architecture:

```text
React
  ↓
FastAPI
  ↓
LLM Service
  ↓
Model
```

Features:

- Streaming responses
- Conversation history
- Authentication
- Rate limiting
- Error handling
- Logging
- Model configuration
- Token/cost tracking

---

# Phase 8 — Embeddings + Vector Search

## Duration

Weeks 33–35

Learn:

- Embeddings
- Cosine similarity
- Vector indexing
- Approximate nearest-neighbor search
- Metadata filtering
- Similarity thresholds

Start with:

```text
PostgreSQL + pgvector
```

You already know PostgreSQL, so this is a good fit.

---

# Project 5 — Semantic Search

Build:

**AI Knowledge Search**

```text
Documents
   ↓
Chunking
   ↓
Embedding
   ↓
PostgreSQL + pgvector
   ↓
Similarity Search
   ↓
Relevant Results
```

Features:

- Document upload
- Search
- Metadata
- Filtering
- Similarity score
- Pagination
- API

---

# Phase 9 — RAG

## Duration

Weeks 36–39

This should be one of your strongest areas.

---

# 9.1 RAG Architecture

```text
                INDEXING
Document
   ↓
Extraction
   ↓
Cleaning
   ↓
Chunking
   ↓
Embedding
   ↓
Vector Database


                 QUERY
User Question
   ↓
Query Embedding
   ↓
Retriever
   ↓
Relevant Chunks
   ↓
Optional Reranker
   ↓
Context
   ↓
LLM
   ↓
Answer
```

---

# 9.2 Learn Chunking

Understand:

- Fixed-size chunks
- Sentence chunks
- Paragraph chunks
- Semantic chunks
- Overlap
- Metadata

Learn why bad chunking can destroy retrieval quality.

---

# 9.3 Retrieval

Learn:

- Top-k
- Similarity thresholds
- Metadata filtering
- Hybrid search
- Keyword + vector search
- Reranking

---

# 9.4 RAG Failure Modes

Understand:

- Wrong retrieval
- Missing context
- Too much context
- Hallucination
- Duplicate chunks
- Bad chunk boundaries
- Stale data
- Prompt injection
- Citation errors

---

# Project 6 — AI Document Intelligence Platform

Build a real SaaS-style system.

### Users can:

- Upload PDFs
- Upload DOCX
- Upload text files
- Create knowledge bases
- Ask questions
- Get citations
- See source chunks
- Delete documents
- Search documents
- Maintain conversation history

Architecture:

```text
React
   ↓
FastAPI
   ↓
PostgreSQL
   ├── users
   ├── documents
   ├── chunks
   ├── conversations
   └── messages
   ↓
pgvector
   ↓
Embedding Model
   ↓
LLM
```

Add background processing:

```text
Upload
 ↓
Queue
 ↓
Worker
 ↓
Extract
 ↓
Chunk
 ↓
Embed
 ↓
Store
```

---

# Phase 10 — AI Agents

## Duration

Weeks 40–43

Do not start with complicated multi-agent systems.

First understand the basic agent loop.

```text
User
 ↓
LLM
 ↓
Decide action
 ↓
Tool
 ↓
Tool result
 ↓
LLM
 ↓
Final answer
```

---

# Learn Tool Calling

Build tools such as:

```python
search_database()
search_documents()
get_customer()
calculate_revenue()
get_weather()
create_ticket()
send_email()
```

The model chooses a tool.

Your backend executes it.

The result goes back to the model.

---

# Agent Concepts

Learn:

- Tool calling
- State
- Memory
- Planning
- Reflection
- Routing
- Human approval
- Guardrails
- Tool permissions
- Retries
- Timeouts
- Idempotency

---

# Project 7 — AI Business Agent

Build:

**AI Operations Assistant**

Example:

```text
User:
"Show me customers whose orders dropped this month."

Agent
 ↓
Understand request
 ↓
Query PostgreSQL
 ↓
Analyze result
 ↓
Generate explanation
```

Give the agent tools:

```text
query_database()
search_documents()
generate_report()
create_task()
send_email()
```

Add permission checks.

The LLM should **never directly receive unrestricted database access**.

---

# Phase 11 — LLM Evaluation

## Duration

Weeks 44–46

This is often ignored by beginners and is extremely important for production AI.

You need to measure:

### RAG

- Retrieval precision
- Retrieval recall
- Context relevance
- Answer relevance
- Faithfulness
- Citation correctness

### LLM

- Accuracy
- Instruction following
- Structured output validity
- Safety
- Latency
- Cost

Build a dataset:

```text
questions.json
```

Example:

```json
{
  "question": "What is the refund period?",
  "expected_answer": "30 days",
  "expected_source": "refund-policy.pdf"
}
```

Run evaluations automatically.

---

# Project 8 — AI Evaluation Framework

Build an internal tool:

```text
Dataset
   ↓
Run model
   ↓
Collect response
   ↓
Evaluate
   ↓
Metrics
   ↓
Dashboard
```

Dashboard:

- Accuracy
- Latency
- Token usage
- Cost
- Retrieval score
- Failure examples

---

# Phase 12 — AI Security

## Duration

Weeks 47–48

Learn:

- Prompt injection
- Indirect prompt injection
- Data leakage
- Jailbreaks
- Excessive tool permissions
- Insecure output handling
- Sensitive data exposure
- Authentication
- Authorization
- Rate limiting
- Secrets management

For agents:

```text
LLM
 ↓
Permission layer
 ↓
Tool
```

not:

```text
LLM
 ↓
Unrestricted system access
```

---

# Phase 13 — MLOps / AI Infrastructure

## Duration

Months 11–12

Learn:

### Docker

You should be comfortable with:

```bash
docker build
docker run
docker compose
docker logs
docker exec
```

---

## APIs

Build production APIs with FastAPI.

Learn:

- Pydantic
- Dependency injection
- Authentication
- Async endpoints
- Streaming
- Background jobs
- Error handling
- OpenAPI

---

## Redis

Use Redis for:

- Caching
- Rate limiting
- Job queues
- Temporary state

---

## PostgreSQL

Learn:

- Indexes
- Query optimization
- Transactions
- Connection pooling
- pgvector

---

## Queues

Understand:

```text
API
 ↓
Queue
 ↓
Worker
 ↓
AI processing
```

This is important for long-running AI jobs.

---

## Monitoring

Track:

```text
Request
 ↓
Latency
 ↓
Model
 ↓
Tokens
 ↓
Cost
 ↓
Error
```

Learn structured logging and metrics.

---

# Cloud

Pick **one cloud first**.

AWS or GCP are both reasonable.

Learn:

- Compute
- Storage
- Networking
- IAM
- Secrets
- Databases
- Containers
- Logging
- Monitoring

Do not try to master every cloud provider.

---

# Phase 14 — Final Capstone

## Duration

6–8 weeks

Build one serious production-style AI platform.

# Capstone: AI Business Intelligence & Operations Agent

This project should combine almost everything.

---

## Product

A company connects its:

- PostgreSQL database
- Documents
- Reports
- Customer information
- Orders
- Internal knowledge

Then employees can ask:

```text
"What were our sales last month?"

"Why did revenue decline?"

"Find customers whose purchases dropped."

"Search the refund policy."

"Generate a weekly business report."

"Create a follow-up task for these customers."
```

---

# Architecture

```text
                         React
                           │
                           ↓
                     API Gateway
                           │
                           ↓
                        FastAPI
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
           Auth          Agent        RAG
              │            │            │
              ↓            ↓            ↓
          PostgreSQL     Tools       pgvector
                           │            │
              ┌────────────┼────────────┤
              ↓            ↓            ↓
             DB          Search       LLM
              │            │            │
              └────────────┴────────────┘
                           │
                           ↓
                       Response
```

---

# Capstone Features

## Authentication

- Signup
- Login
- JWT
- Refresh token
- RBAC

## Knowledge Base

- Upload documents
- Parse documents
- Chunk
- Embed
- Store
- Search

## AI Chat

- Streaming
- Conversation history
- Citations
- Tool calls

## Database Agent

Safe database tools:

```text
get_sales()
get_customers()
get_orders()
get_revenue()
```

Avoid unrestricted SQL execution from the model.

## Reports

Generate:

- Sales reports
- Customer reports
- Operational summaries
- Weekly reports

## Admin

Dashboard showing:

- AI requests
- Token usage
- Latency
- Errors
- Users
- Documents
- Agent actions

---

# 6. Portfolio Projects

You should finish with approximately **6–8 strong projects**, not 30 tiny projects.

## Portfolio

### 1. ML Prediction API

Demonstrates:

- Classical ML
- Data processing
- Evaluation
- FastAPI

### 2. Computer Vision Classifier

Demonstrates:

- PyTorch
- CNN
- Training
- Inference

### 3. Mini Transformer

Demonstrates:

- Attention
- Transformers
- Deep-learning fundamentals

### 4. LLM Chatbot

Demonstrates:

- LLM APIs
- Streaming
- Backend integration

### 5. Semantic Search

Demonstrates:

- Embeddings
- Vector databases
- Retrieval

### 6. RAG Platform

Demonstrates:

- Document processing
- Retrieval
- Reranking
- Citations
- Evaluation

### 7. AI Agent

Demonstrates:

- Tool calling
- Database integration
- Permissions
- Agent workflows

### 8. Final AI SaaS

Demonstrates:

- End-to-end architecture
- Authentication
- AI
- Backend
- Database
- Deployment
- Monitoring
- Production engineering

---

# 7. Weekly Schedule

If you have a full-time job, use:

## Monday–Friday

### 1.5–2 hours/day

```text
30 min  Theory
45 min  Coding
30 min  Project
15 min  Notes
```

## Saturday

3–5 hours:

```text
Project development
```

## Sunday

3–4 hours:

```text
Project
Revision
GitHub documentation
Interview preparation
```

Target:

```text
~15 hours/week
```

At 15 hours/week:

```text
15 × 52 ≈ 780 hours/year
```

That is enough time for serious progress if the hours are focused.

---

# 8. Daily Routine

Use this template:

```text
DAY ___

Topic:
____________________

What I learned:
____________________

Code written:
____________________

Problem solved:
____________________

What confused me:
____________________

Tomorrow:
____________________
```

Keep everything in GitHub or a local knowledge base.

---

# 9. How to Study Each Topic

For every concept use this sequence:

```text
1. Understand
2. Explain it without notes
3. Implement a tiny version
4. Use the library implementation
5. Build something with it
6. Measure it
7. Break it intentionally
8. Fix it
9. Document it
```

Example:

### RAG

Don't just learn:

> "RAG retrieves documents."

Instead:

```text
Build RAG
 ↓
Create bad chunks
 ↓
Measure retrieval
 ↓
Improve chunking
 ↓
Add metadata
 ↓
Add reranking
 ↓
Evaluate
 ↓
Document tradeoffs
```

That is engineering.

---

# 10. GitHub Portfolio Strategy

Every serious project should have:

```text
project/
├── README.md
├── architecture/
├── src/
├── tests/
├── scripts/
├── notebooks/
├── docker/
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

README should contain:

1. Problem
2. Solution
3. Architecture
4. Tech stack
5. How it works
6. Installation
7. API documentation
8. Screenshots
9. Evaluation
10. Performance
11. Limitations
12. Future improvements

---

# 11. What You Should NOT Do

Avoid these mistakes.

## Don't learn every framework

You don't need:

```text
LangChain
LangGraph
LlamaIndex
CrewAI
AutoGen
...all at once
```

Learn the underlying concepts first.

---

## Don't only learn prompting

Prompting is one part of LLM engineering.

You also need:

```text
Retrieval
Models
Embeddings
Evaluation
Backend
Security
Deployment
Monitoring
```

---

## Don't only use APIs

You should understand how models work internally.

At minimum understand:

```text
Tokenization
Embeddings
Attention
Transformers
Inference
Training
Fine-tuning
```

---

## Don't immediately fine-tune models

First learn:

```text
Prompting
 ↓
RAG
 ↓
Evaluation
 ↓
Tool calling
 ↓
Fine-tuning
```

Fine-tuning is not the default solution to every problem.

---

# 12. Fine-Tuning

Learn this after you understand LLM fundamentals.

Topics:

- Dataset preparation
- Instruction datasets
- Supervised fine-tuning
- LoRA
- QLoRA
- PEFT
- Evaluation
- Catastrophic forgetting
- Overfitting

Build a small experiment rather than trying to train a huge model.

Understand the difference between:

```text
Prompting
RAG
Fine-tuning
Continued pretraining
```

and when each is useful.

---

# 13. AI System Design

For interviews and real work, learn how to design:

### AI Chat System

```text
User
 ↓
API
 ↓
Conversation Store
 ↓
LLM
 ↓
Streaming
```

### RAG System

```text
Documents
 ↓
Processing
 ↓
Embedding
 ↓
Vector DB
 ↓
Retriever
 ↓
Reranker
 ↓
LLM
```

### Agent System

```text
User
 ↓
Planner/LLM
 ↓
Tool Router
 ↓
Permission Layer
 ↓
Tools
 ↓
Observations
 ↓
LLM
```

### Large-scale AI system

Think about:

- Caching
- Queues
- Rate limits
- Horizontal scaling
- Model routing
- GPU utilization
- Failover
- Cost
- Latency
- Observability
- Security

---

# 14. Interview Preparation

Start interview preparation around Month 6.

---

## Python

Know:

- OOP
- Iterators
- Generators
- Decorators
- Async
- Concurrency basics
- Memory concepts
- Type hints
- Testing

---

## ML

Be able to explain:

- Overfitting
- Underfitting
- Bias/variance
- Regularization
- Feature engineering
- Data leakage
- Cross-validation
- Precision vs recall
- Class imbalance
- Gradient descent
- Decision trees
- Ensemble methods

---

## Deep Learning

Know:

- Backpropagation
- CNNs
- Optimizers
- Learning rate
- Batch size
- Normalization
- Dropout
- Transfer learning
- GPU training

---

## LLM

Know:

- Tokens
- Embeddings
- Attention
- Transformers
- Context window
- Temperature
- RAG
- Vector search
- Reranking
- Tool calling
- Agents
- Evaluation
- Fine-tuning
- Quantization

---

# 15. System Design Interview Questions

Practice designing:

1. ChatGPT-like system
2. RAG platform
3. AI customer support system
4. Recommendation engine
5. Document processing system
6. AI coding assistant
7. AI analytics agent
8. Image classification platform
9. LLM inference API
10. Multi-tenant AI SaaS

For each design answer:

```text
Requirements
 ↓
Architecture
 ↓
Data flow
 ↓
Database
 ↓
Model
 ↓
API
 ↓
Scaling
 ↓
Caching
 ↓
Security
 ↓
Monitoring
 ↓
Cost
```

---

# 16. DSA

Do not ignore DSA if your goal includes major tech companies.

Learn:

### Arrays

- Two pointers
- Sliding window
- Prefix sums

### Strings

- Hashing
- Pattern matching basics

### Linked Lists

- Reverse
- Fast/slow pointers

### Stack/Queue

- Monotonic stack
- BFS

### Trees

- DFS
- BFS
- Binary search tree

### Graphs

- BFS
- DFS
- Topological sort
- Shortest path basics

### Dynamic Programming

Start with:

- 1D DP
- 2D DP
- Knapsack
- Subsequence problems

Target approximately:

```text
150–250 well-understood problems
```

rather than blindly solving hundreds.

---

# 17. Job Roles to Target

After completing the roadmap, relevant roles include:

- AI Engineer
- Generative AI Engineer
- LLM Engineer
- AI Application Engineer
- Machine Learning Engineer
- ML Engineer
- Applied AI Engineer
- NLP Engineer
- Computer Vision Engineer
- AI Platform Engineer
- ML Platform Engineer
- MLOps Engineer

Job descriptions vary significantly, so compare their actual requirements rather than relying only on job titles.

---

# 18. Skill Matrix

By the end, aim for:

| Skill | Target |
|---|---|
| Python | Advanced |
| NumPy | Strong |
| Pandas | Strong |
| SQL | Strong |
| Statistics | Strong fundamentals |
| Linear Algebra | Strong fundamentals |
| ML | Strong |
| scikit-learn | Strong |
| PyTorch | Strong |
| Deep Learning | Strong |
| NLP | Strong |
| Transformers | Strong |
| LLMs | Strong |
| RAG | Advanced |
| Agents | Advanced |
| Evaluation | Strong |
| FastAPI | Strong |
| PostgreSQL | Strong |
| pgvector | Strong |
| Redis | Intermediate |
| Docker | Strong |
| Cloud | Intermediate/Strong |
| MLOps | Intermediate |
| System Design | Strong |
| DSA | Interview-ready |

---

# 19. Monthly Milestones

## Month 1

```text
Python
Math
NumPy
Pandas
```

Deliverable:

**Data Analysis Project**

---

## Month 2

```text
ML
scikit-learn
Statistics
```

Deliverable:

**ML Prediction API**

---

## Month 3

```text
Advanced ML
Feature engineering
Evaluation
```

Deliverable:

**Production-style ML project**

---

## Month 4

```text
PyTorch
Neural networks
CNN
```

Deliverable:

**Computer Vision project**

---

## Month 5

```text
Deep Learning
NLP
Embeddings
```

Deliverable:

**NLP project**

---

## Month 6

```text
Transformers
Attention
Tokenization
```

Deliverable:

**Mini Transformer**

---

## Month 7

```text
LLMs
Prompting
Inference
Ollama
```

Deliverable:

**AI Chatbot**

---

## Month 8

```text
Embeddings
Vector search
RAG
```

Deliverable:

**PDF RAG application**

---

## Month 9

```text
Advanced RAG
Reranking
Evaluation
```

Deliverable:

**Production-style RAG platform**

---

## Month 10

```text
Agents
Tool calling
Memory
Permissions
```

Deliverable:

**AI Agent**

---

## Month 11

```text
MLOps
Docker
Redis
Queues
Cloud
Monitoring
```

Deliverable:

**Deployed AI system**

---

## Month 12

```text
System design
DSA
Interview preparation
Capstone
Portfolio
```

Deliverable:

**Complete AI SaaS platform**

---

# 20. The Most Important Learning Order

If you become confused about what to study next, use this exact order:

```text
Python
 ↓
NumPy/Pandas
 ↓
Math
 ↓
Statistics
 ↓
Machine Learning
 ↓
scikit-learn
 ↓
PyTorch
 ↓
Deep Learning
 ↓
NLP
 ↓
Transformers
 ↓
LLMs
 ↓
Embeddings
 ↓
Vector Search
 ↓
RAG
 ↓
Evaluation
 ↓
Tool Calling
 ↓
Agents
 ↓
AI Security
 ↓
MLOps
 ↓
Cloud
 ↓
AI System Design
```

---

# 21. Your Golden Rule

Do not measure progress by:

```text
"How many courses did I complete?"
```

Measure progress by:

```text
"How many AI systems can I build and explain?"
```

A strong progression looks like:

```text
I can call an LLM
        ↓
I understand how LLMs work
        ↓
I can build RAG
        ↓
I can evaluate RAG
        ↓
I can build agents
        ↓
I can secure agents
        ↓
I can deploy AI systems
        ↓
I can scale AI systems
        ↓
I can design AI systems
        ↓
I can explain and defend my engineering decisions
```

---

# 22. Final Definition of "Job Ready"

You should consider yourself ready to seriously apply when you can independently build something like:

```text
                    USER
                      │
                      ↓
                   React
                      │
                      ↓
                  FastAPI
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
        Auth        RAG         Agent
          │           │           │
          ↓           ↓           ↓
      PostgreSQL   pgvector     Tools
          │           │           │
          └───────────┼───────────┘
                      ↓
                     LLM
                      │
                      ↓
                 Evaluation
                      │
                      ↓
                 Monitoring
                      │
                      ↓
                    Cloud
```

And you can answer:

- Why this architecture?
- Why this model?
- Why this database?
- Why this chunking strategy?
- How do you evaluate it?
- How do you prevent hallucinations?
- How do you handle prompt injection?
- How do you control cost?
- How do you reduce latency?
- How do you scale it?
- What happens when the model fails?
- How do you monitor production?
- What would you change at 10× traffic?

If you can answer those questions from your own implementation experience, you are no longer just experimenting with AI—you are doing **AI Engineering**.

---

# 23. Recommended Personal Strategy

Given your existing full-stack background, use this split:

```text
                    YOUR TIME
                       100%
                        │
            ┌───────────┴───────────┐
            ↓                       ↓
       AI/ML learning          Existing skills
           70%                      30%
            │                       │
     ┌──────┼──────┐                │
     ↓      ↓      ↓                ↓
    ML     DL     LLM          React/TS
                         FastAPI/Postgres
```

Don't abandon software engineering.

Your advantage is being able to combine:

```text
Software Engineering
        +
Machine Learning
        +
LLM Engineering
        +
Cloud
        =
AI Engineer
```

That combination is much more useful than knowing isolated AI concepts.

---

# 24. Final 12-Month Target

At the end of the roadmap, your GitHub should contain:

```text
01-ml-prediction-api
02-computer-vision
03-mini-transformer
04-llm-chatbot
05-semantic-search
06-rag-platform
07-ai-agent
08-ai-evaluation-framework
09-production-ai-saas
```

And your profile should demonstrate:

```text
✓ Python
✓ Machine Learning
✓ Deep Learning
✓ PyTorch
✓ Transformers
✓ LLMs
✓ RAG
✓ Agents
✓ Evaluation
✓ AI Security
✓ FastAPI
✓ PostgreSQL
✓ Vector Search
✓ Redis
✓ Docker
✓ Cloud
✓ System Design
✓ DSA
```

---

# 25. Start Here

Do **not** try to learn the entire roadmap today.

Start with:

```text
WEEK 1
 ├── Python for AI
 ├── NumPy
 ├── Pandas
 ├── Jupyter
 └── GitHub AI repository

WEEK 2
 ├── Python advanced concepts
 ├── NumPy exercises
 └── Pandas data analysis

WEEK 3
 ├── Statistics basics
 ├── Visualization
 └── Data analysis project

WEEK 4
 ├── Linear algebra
 ├── Vectors
 ├── Matrices
 └── ML foundations
```

Then continue phase by phase.

**The goal isn't to finish a syllabus. The goal is to become capable of taking an AI problem from idea → data/model → backend → evaluation → deployment → production.**
