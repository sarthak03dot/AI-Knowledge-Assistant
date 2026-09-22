# AI-Knowledge-Assistant — Production Hybrid RAG & Vector Database

A production-grade **Retrieval-Augmented Generation (RAG)** knowledge assistant powered by **Qdrant Vector Database (HNSW)**, **NVIDIA NIM & Multi-Provider AI (Groq, Gemini, OpenRouter)**, **MongoDB Atlas (User Authentication & Sessions)**, **Cloudinary Storage**, and a **React 19 + TypeScript Single Page Application**.

---

## 🌟 Key Features

1. **Qdrant Vector Database Engine (`backend/rag/qdrant_store.py`)**:
   - High-performance vector database with **HNSW Indexing** and **Cosine Similarity**.
   - **Hybrid Retrieval**: Combines Dense Vector embeddings with Okapi BM25 Sparse Keyword search using Reciprocal Rank Fusion.
   - Remote Cloud Cluster + Local Embedded On-Disk mode.

2. **MongoDB Atlas Database & User Authentication (`backend/db/` & `backend/auth/`)**:
   - Connected to MongoDB Atlas cluster for user management, secure PBKDF2 password hashing, and signed JWT access tokens (7-day duration).
   - Local SQLite fallback when offline.

3. **Real-Time Token Streaming (SSE)**:
   - Server-Sent Events (`POST /api/chat/stream`) emit immediate metadata & citations, followed by token-by-token generation with anti-buffering headers.

4. **React 19 + TypeScript SPA (`client/`)**:
   - Paced typewriter streaming queue with glowing blinking cursor (`▌`).
   - Interactive source citation pill badges with context preview modal.
   - Live Vector Search Playground comparing Dense vs Sparse similarity scores.
   - Drag & drop document ingestion (PDF, Markdown, TXT, CSV, JSON).

---

## 📁 Industry-Standard Directory Structure

```
├── backend/                        # Backend Application & Services
│   ├── main.py                     # FastAPI REST API & SSE Streaming Server
│   ├── models.py                   # API Request & Response Pydantic Models
│   ├── requirements.txt            # Python Dependencies (FastAPI, Qdrant, PyMongo, PyJWT)
│   ├── auth/                       # User Authentication & Security
│   │   ├── routes.py               # /api/auth/register, /api/auth/login, /api/auth/me
│   │   └── security.py             # PBKDF2 Password Hashing & JWT Token Handlers
│   ├── db/                         # Database & Session Layer
│   │   ├── database.py             # MongoDB Atlas Manager & SQLite Fallback
│   │   └── models.py               # Database User Models & Schemas
│   ├── rag/                        # RAG & Vector Engine
│   │   ├── chunker.py              # Recursive Document Chunker with Overlap
│   │   ├── embeddings.py           # Multi-Provider Vector Embedding Engine
│   │   ├── pipeline.py             # RAG Orchestrator & Multi-Provider Fallbacks
│   │   ├── qdrant_store.py         # Production Qdrant Client (HNSW + BM25)
│   │   └── vector_store.py         # Search Result Data Classes
│   ├── data/                       # Vector & Local Data Persistence
│   ├── sample_data/                # Knowledge Base Documents (RAG, Vectors, Transformers)
│   └── tests/                      # Automated Test Suite
│       └── test_rag.py             # RAG & Vector Store Tests
│
├── client/                         # Frontend Application (React 19 + TypeScript + Vite)
│   ├── index.html                  # HTML5 Entry Point
│   ├── package.json                # Frontend Dependencies (Lucide Icons, React 19)
│   ├── vite.config.ts              # Vite Config with /api Dev Proxy
│   └── src/
│       ├── main.tsx                # React Root Mount
│       ├── App.tsx                 # App Shell & Modal State Manager
│       ├── index.css               # Glassmorphism Design System & Typography
│       ├── types/rag.ts            # TypeScript Type Definitions
│       ├── services/api.ts         # REST & SSE Streaming Client
│       └── components/             # Reusable UI Components
│           ├── Sidebar.tsx         # Navigation, Docs List, DB Pill & User Profile
│           ├── ChatView.tsx        # Real-Time Typewriter Streaming Chat
│           ├── VectorPlayground.tsx# HNSW Dense vs BM25 Sparse Tester
│           ├── AuthModal.tsx       # Sign In / Sign Up Modal
│           ├── ChunkModal.tsx      # Qdrant Vector Chunk Inspector
│           ├── CitationModal.tsx   # Source Context Popover
│           └── SettingsModal.tsx   # Multi-Provider Key Overrides & Tuning
│
├── Dockerfile                      # Production Multi-Stage Container
├── .dockerignore                   # Docker Build Exclusions
├── .env                            # Environment Variables (API Keys, MongoDB, Qdrant)
├── .env.example                    # Template Environment Configuration
├── package.json                    # Root Project Scripts
├── start.sh                        # One-Click Startup Script
└── README.md                       # Project Documentation
```

---

## 🚀 How to Run

### 1. Production Mode (Unified FastAPI Server)
```bash
./start.sh
```
Open **`http://localhost:8000`** in your browser.

### 2. Development Mode (Vite HMR + Backend)
```bash
# Terminal 1: Backend
./start.sh

# Terminal 2: Frontend with Live Reload
cd client && npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🧪 Running Tests

```bash
PYTHONPATH=. pytest backend/tests/test_rag.py
```
