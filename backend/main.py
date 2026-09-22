"""
FastAPI Server for AI Knowledge Assistant (RAG + Qdrant Vector Database)
with Real-Time SSE Token Streaming.
"""

import os
import uuid
import time
import io
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse, RedirectResponse

# Load .env variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(BASE_DIR, ".env")
if os.path.exists(ENV_FILE):
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

from .models import (
    ChatRequest,
    ChatSessionCreate,
    ChatSessionUpdate,
    VectorSearchRequest,
    DocumentIngestTextRequest,
    ConfigUpdateRequest,
)
from .rag.pipeline import RAGPipeline
from .rag.qdrant_store import QdrantVectorStore
from .rag.embeddings import EmbeddingEngine
from .rag.chunker import RecursiveChunker
from .db.database import db_manager
from .db.cloudinary_service import cloudinary_service
from .auth.routes import auth_router
from .payments.routes import router as payments_router
from .auth.security import get_current_user, get_current_user_optional
from fastapi import Depends

# Initialize FastAPI App
app = FastAPI(
    title="NexusRAG — AI Knowledge Assistant (RAG + Qdrant Vector DB + Neon/MongoDB)",
    description="Production RAG with Qdrant Vector Database, MongoDB Atlas, Cloudinary Storage & Multi-Provider Fallbacks",
    version="2.3.0",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth_router)
app.include_router(payments_router)

# Global Qdrant Vector DB Instance (Embedded on-disk or remote)
vector_db = QdrantVectorStore(storage_path=os.path.join(BASE_DIR, "backend", "data", "qdrant_storage"), vector_dim=768)
embedding_engine = EmbeddingEngine()
pipeline = RAGPipeline(vector_db=vector_db, embedding_engine=embedding_engine)

# Persistent Local Document Storage Directory (Fast reliable inline preview & cache)
DOCS_STORAGE_DIR = os.path.join(BASE_DIR, "backend", "data", "documents")
os.makedirs(DOCS_STORAGE_DIR, exist_ok=True)

CLIENT_DIR = os.path.join(BASE_DIR, "client")
CLIENT_DIST = os.path.join(CLIENT_DIR, "dist")


# -------------------------------------------------------------
# REST & STREAMING ENDPOINTS
# -------------------------------------------------------------

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "NexusRAG Assistant",
        "vector_engine": "Qdrant Vector Database (HNSW)",
        "database": db_manager.db_type,
        "is_neon": getattr(db_manager, "is_neon", False),
        "timestamp": time.time(),
        "documents_count": len(vector_db.doc_index),
        "chunks_count": len(vector_db.chunks),
    }


@app.get("/api/stats")
def get_stats(user: Optional[dict] = Depends(get_current_user_optional)):
    """Retrieve telemetry, database type, and Qdrant vector metrics."""
    if user:
        user_docs = db_manager.get_user_documents(user["id"])
        user_docs_count = len(user_docs)
        user_chunks_count = sum(d.get("chunk_count", 0) for d in user_docs)
    else:
        user_docs_count = len(vector_db.doc_index)
        user_chunks_count = len(vector_db.chunks)

    return {
        "total_documents": user_docs_count,
        "total_chunks": user_chunks_count,
        "vector_dimension": vector_db.vector_dim,
        "vector_database": "Qdrant (HNSW Cosine)",
        "database": db_manager.db_type,
        "is_neon": getattr(db_manager, "is_neon", False),
        "has_cloudinary": cloudinary_service.is_configured,
        "cloudinary_cloud": cloudinary_service.cloud_name,
        "embedding_provider": embedding_engine.provider,
        "has_nvidia": bool(os.getenv("NVIDIA_API_KEY") or os.getenv("NVDIA_API")),
        "has_gemini": bool(os.getenv("GEMINI_API_KEY")),
        "has_groq": bool(os.getenv("GROQ_API_KEY")),
        "has_openrouter": bool(os.getenv("OPENROUTER_API_KEY")),
        "avg_chunk_length_words": round(vector_db.avg_chunk_length, 1),
        "vocabulary_size": len(vector_db.doc_freq),
    }


@app.get("/api/documents")
def list_documents(user: dict = Depends(get_current_user)):
    """List documents belonging to the authenticated user."""
    user_id = user["id"]
    db_docs = db_manager.get_user_documents(user_id)
    if not db_docs:
        # Fallback to vector_db filtered by user_id if needed
        db_docs = vector_db.list_documents(user_id=user_id)
    return {"documents": db_docs}


@app.get("/api/documents/{doc_id}/chunks")
def get_document_chunks(doc_id: str, user: dict = Depends(get_current_user)):
    """Inspect chunks for a specific user document."""
    chunk_ids = vector_db.doc_index.get(doc_id, [])
    if not chunk_ids:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks = []
    for cid in chunk_ids:
        if hasattr(vector_db, "chunks_cache") and cid in vector_db.chunks_cache:
            p = vector_db.chunks_cache[cid]
            chunks.append({
                "chunk_id": cid,
                "chunk_index": p["chunk_index"],
                "char_count": p["char_count"],
                "word_count": p["word_count"],
                "text": p["text"],
            })
        elif cid in vector_db.chunks:
            meta = vector_db.chunks[cid]
            chunks.append({
                "chunk_id": cid,
                "chunk_index": meta.chunk_index,
                "char_count": meta.char_count,
                "word_count": meta.word_count,
                "text": meta.text,
            })
    return {"doc_id": doc_id, "chunks": chunks}


@app.get("/api/documents/{doc_id}/preview")
def get_document_preview(doc_id: str, user: Optional[dict] = Depends(get_current_user_optional)):
    """
    Returns rich preview metadata for viewing the original document from Cloudinary:
    - Multi-page rendered image URLs (pg_1, pg_2, pg_3...)
    - Signed Cloudinary URL
    - Authorized private download URL
    - Total page count
    """
    doc_meta = db_manager.get_document_by_id(doc_id)
    if not doc_meta:
        for uid in vector_db.doc_index.keys():
            if uid == doc_id:
                doc_meta = {"doc_id": doc_id, "doc_name": f"document_{doc_id}"}
                break

    if not doc_meta:
        raise HTTPException(status_code=404, detail="Document not found")

    public_id = doc_meta.get("cloudinary_public_id") or f"nexusrag_docs/{doc_id}_{doc_meta.get('doc_name', '')}"
    doc_name = doc_meta.get("doc_name", "")

    preview_info = cloudinary_service.get_document_preview_info(public_id, filename=doc_name)

    return {
        "doc_id": doc_id,
        "doc_name": doc_name,
        "cloudinary_url": doc_meta.get("cloudinary_url"),
        "cloudinary_public_id": public_id,
        "total_pages": preview_info.get("total_pages", 0),
        "page_urls": preview_info.get("page_urls", []),
        "signed_url": preview_info.get("signed_url", ""),
        "private_download_url": preview_info.get("private_download_url", ""),
        "stream_view_url": f"/api/documents/{doc_id}/view",
    }


@app.get("/api/documents/{doc_id}/view")
@app.get("/api/documents/{doc_id}/download")
def view_or_download_document(
    doc_id: str,
    download: bool = False,
    token: Optional[str] = Query(None),
    user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Streams the raw document for seamless inline browser viewing or downloading.
    1. Looks in local persistent storage cache (fastest & 100% reliable)
    2. Falls back to Cloudinary authenticated retrieval using API credentials
    3. Serves with correct MIME type (e.g. application/pdf) and Content-Disposition header.
    """
    # Find document record in MongoDB
    doc_meta = db_manager.get_document_by_id(doc_id)
    doc_name = doc_meta.get("doc_name", f"document_{doc_id}.pdf") if doc_meta else f"document_{doc_id}.pdf"

    # MIME type detection
    ext = os.path.splitext(doc_name)[1].lower()
    mime_map = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls": "application/vnd.ms-excel",
        ".csv": "text/csv; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
        ".json": "application/json",
        ".md": "text/markdown; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }
    media_type = mime_map.get(ext, "application/octet-stream")
    disposition = "attachment" if download else "inline"
    headers = {"Content-Disposition": f'{disposition}; filename="{doc_name}"'}

    # 1. Try local storage cache
    local_candidates = [
        os.path.join(DOCS_STORAGE_DIR, f"{doc_id}_{doc_name}"),
        os.path.join(DOCS_STORAGE_DIR, f"{doc_id}"),
    ]
    for lp in local_candidates:
        if os.path.exists(lp):
            try:
                with open(lp, "rb") as f:
                    file_bytes = f.read()
                return StreamingResponse(io.BytesIO(file_bytes), media_type=media_type, headers=headers)
            except Exception:
                pass

    # Search wildcard in local dir
    if os.path.exists(DOCS_STORAGE_DIR):
        for fname in os.listdir(DOCS_STORAGE_DIR):
            if fname.startswith(f"{doc_id}_") or fname.startswith(f"{doc_id}."):
                try:
                    with open(os.path.join(DOCS_STORAGE_DIR, fname), "rb") as f:
                        file_bytes = f.read()
                    return StreamingResponse(io.BytesIO(file_bytes), media_type=media_type, headers=headers)
                except Exception:
                    pass

    # 2. Try fetching from Cloudinary via authenticated API
    if doc_meta:
        pub_id = doc_meta.get("cloudinary_public_id")
        cld_url = doc_meta.get("cloudinary_url")
        raw_bytes = cloudinary_service.get_file_bytes(
            public_id=pub_id,
            filename=doc_name,
            cloudinary_url=cld_url,
        )
        if raw_bytes:
            # Cache locally for instant future requests
            try:
                cache_path = os.path.join(DOCS_STORAGE_DIR, f"{doc_id}_{doc_name}")
                with open(cache_path, "wb") as f:
                    f.write(raw_bytes)
            except Exception:
                pass
            return StreamingResponse(io.BytesIO(raw_bytes), media_type=media_type, headers=headers)

    # 3. Fallback: Reconstruct document text from indexed vector chunks (100% resilient & readable)
    chunk_ids = vector_db.doc_index.get(doc_id, [])
    if chunk_ids:
        chunk_texts = []
        for cid in chunk_ids:
            if hasattr(vector_db, "chunks_cache") and cid in vector_db.chunks_cache:
                p = vector_db.chunks_cache[cid]
                chunk_texts.append(p.get("text", ""))
            elif cid in vector_db.chunks:
                chunk_texts.append(vector_db.chunks[cid].text)

        if chunk_texts:
            passages_html = "".join(
                f'<div class="passage"><div class="passage-meta"><span class="badge">Passage #{i+1}</span></div><p>{t}</p></div>'
                for i, t in enumerate(chunk_texts)
            )
            full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{doc_name} — Document Reader</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #070a13; color: #cbd5e1; padding: 32px 24px; line-height: 1.8; }}
  .container {{ max-width: 880px; margin: 0 auto; }}
  .header {{ background: #0f172a; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }}
  .title {{ font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 6px; }}
  .meta {{ font-size: 13px; color: #818cf8; font-weight: 600; }}
  .passage {{ background: #0d1322; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 20px; margin-bottom: 16px; transition: border-color 0.2s; }}
  .passage:hover {{ border-color: rgba(99,102,241,0.3); }}
  .passage-meta {{ margin-bottom: 12px; }}
  .badge {{ display: inline-block; font-size: 11px; font-weight: 800; color: #818cf8; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); padding: 2px 8px; border-radius: 6px; }}
  p {{ white-space: pre-wrap; word-break: break-word; font-size: 14px; color: #e2e8f0; }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <div class="title">{doc_name}</div>
      <div class="meta">{len(chunk_texts)} Indexed Semantic Passages • Grounded Q&A Ready</div>
    </div>
  </div>
  {passages_html}
</div>
</body>
</html>"""
            return StreamingResponse(io.BytesIO(full_html.encode("utf-8")), media_type="text/html; charset=utf-8")

    if doc_meta and doc_meta.get("cloudinary_url"):
        return RedirectResponse(url=doc_meta["cloudinary_url"], status_code=307)

    raise HTTPException(status_code=404, detail="Document content not available on server or Cloudinary")


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    """
    3-Layer Clean Deletion:
    1. Delete document record from MongoDB Atlas / SQLite
    2. Delete vector embeddings & chunk payloads from Qdrant
    3. Delete raw uploaded document from Cloudinary Storage & local cache
    """
    user_id = user["id"]

    # 1. Fetch document metadata FIRST before removing from database
    target_doc = db_manager.get_document_by_id(doc_id, user_id=user_id)

    # 2. Delete from database
    deleted_doc = db_manager.delete_user_document(doc_id, user_id=user_id) or target_doc

    # 3. Delete from Qdrant
    deleted_chunks = 0
    try:
        deleted_chunks = vector_db.delete_document(doc_id, user_id=user_id)
    except Exception as e:
        print(f"[Delete] Qdrant deletion note: {e}")

    # 4. Delete from local cache
    if os.path.exists(DOCS_STORAGE_DIR):
        for fname in os.listdir(DOCS_STORAGE_DIR):
            if fname.startswith(f"{doc_id}_") or fname.startswith(f"{doc_id}."):
                try:
                    os.remove(os.path.join(DOCS_STORAGE_DIR, fname))
                except Exception:
                    pass

    # 5. Delete from Cloudinary
    cloudinary_deleted = False
    doc_info = deleted_doc or target_doc
    if doc_info:
        pub_id = doc_info.get("cloudinary_public_id")
        if not pub_id and doc_info.get("cloudinary_url"):
            try:
                url_part = doc_info["cloudinary_url"].split("/upload/")[1]
                if url_part.startswith("v") and "/" in url_part:
                    url_part = url_part.split("/", 1)[1]
                pub_id = url_part
            except Exception:
                pass

        if not pub_id and doc_info.get("doc_name"):
            clean_name = os.path.splitext(doc_info["doc_name"])[0]
            pub_id = f"nexusrag_docs/{doc_id}_{clean_name}"

        if not pub_id:
            pub_id = f"nexusrag_docs/{doc_id}"

        cloudinary_deleted = cloudinary_service.delete_file(
            public_id=pub_id,
            filename=doc_info.get("doc_name"),
        )
    else:
        cloudinary_deleted = cloudinary_service.delete_file(public_id=f"nexusrag_docs/{doc_id}")

    if not deleted_doc and not target_doc and deleted_chunks == 0 and not cloudinary_deleted:
        raise HTTPException(status_code=404, detail="Document not found or access denied")

    return {
        "status": "success",
        "doc_id": doc_id,
        "deleted_chunks": deleted_chunks,
        "cloudinary_deleted": cloudinary_deleted,
    }


@app.post("/api/documents/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Uploads documents to Cloudinary & local storage, extracts text across formats (PDF, DOCX, XLSX, TXT, CSV, JSON),
    indexes vectors into Qdrant with user isolation, and registers metadata in MongoDB Atlas.
    """
    user_id = user["id"]
    results = []

    for file in files:
        doc_id = str(uuid.uuid4())[:8]
        filename = file.filename or f"doc_{doc_id}.txt"
        content_bytes = await file.read()

        # 0. Save locally for instant reliable preview & offline access
        try:
            local_save_path = os.path.join(DOCS_STORAGE_DIR, f"{doc_id}_{filename}")
            with open(local_save_path, "wb") as f:
                f.write(content_bytes)
        except Exception as e:
            print(f"[Upload] Local document caching note: {e}")

        # 1. Upload raw document to Cloudinary
        cld_res = cloudinary_service.upload_file(
            file_bytes=content_bytes,
            filename=filename,
            doc_id=doc_id,
        )
        cloudinary_url = cld_res.get("secure_url") or cld_res.get("url")
        cloudinary_public_id = cld_res.get("public_id")

        # 2. Extract multi-format text (PDF, DOCX, XLSX, CSV, JSON, TXT)
        try:
            extracted_text = pipeline.extract_text_from_file(filename, content_bytes)
        except Exception as e:
            results.append({
                "filename": filename,
                "status": "error",
                "message": f"Failed to extract document text: {str(e)}",
                "cloudinary_url": cloudinary_url,
            })
            continue

        if not extracted_text.strip():
            results.append({
                "filename": filename,
                "status": "error",
                "message": "No readable text content found in document",
                "cloudinary_url": cloudinary_url,
            })
            continue

        # 3. Ingest into Qdrant vector database with user_id
        ingest_res = pipeline.ingest_document(
            doc_id=doc_id,
            doc_name=filename,
            text=extracted_text,
            metadata={
                "user_id": user_id,
                "source_file": filename,
                "file_size": len(content_bytes),
                "cloudinary_url": cloudinary_url,
                "cloudinary_public_id": cloudinary_public_id,
            },
        )
        ingest_res["cloudinary_url"] = cloudinary_url
        ingest_res["cloudinary_public_id"] = cloudinary_public_id

        # 4. Save metadata to MongoDB Atlas / Database
        db_manager.add_user_document(
            user_id=user_id,
            doc_id=doc_id,
            doc_name=filename,
            file_size=len(content_bytes),
            chunk_count=ingest_res.get("chunk_count", 0),
            char_count=ingest_res.get("char_count", 0),
            word_count=ingest_res.get("word_count", 0),
            cloudinary_url=cloudinary_url,
            cloudinary_public_id=cloudinary_public_id,
        )

        results.append(ingest_res)

    return {"uploaded": results}


@app.post("/api/documents/text")
def ingest_raw_text(
    req: DocumentIngestTextRequest,
    user: dict = Depends(get_current_user),
):
    user_id = user["id"]
    doc_id = str(uuid.uuid4())[:8]
    metadata = req.metadata or {}
    metadata["user_id"] = user_id
    metadata["source"] = "direct_text"

    ingest_res = pipeline.ingest_document(
        doc_id=doc_id,
        doc_name=req.doc_name,
        text=req.content,
        metadata=metadata,
    )
    db_manager.add_user_document(
        user_id=user_id,
        doc_id=doc_id,
        doc_name=req.doc_name,
        file_size=len(req.content.encode("utf-8")),
        chunk_count=ingest_res.get("chunk_count", 0),
        char_count=ingest_res.get("char_count", 0),
        word_count=ingest_res.get("word_count", 0),
    )
    return ingest_res


# -------------------------------------------------------------
# CHAT SESSIONS & HISTORY API
# -------------------------------------------------------------

@app.get("/api/chats")
def list_chats(user: dict = Depends(get_current_user)):
    """List all saved chat sessions for the authenticated user."""
    user_id = user["id"]
    chats = db_manager.get_user_chats(user_id)
    return {"chats": chats}


@app.post("/api/chats")
def create_or_sync_chat(
    req: ChatSessionCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new chat session or save initial messages."""
    user_id = user["id"]
    chat_id = req.id or str(uuid.uuid4())[:12]
    messages_dicts = [m.dict() for m in req.messages] if req.messages else []
    chat_data = db_manager.save_chat_session(
        chat_id=chat_id,
        user_id=user_id,
        title=req.title,
        persona=req.persona or "executive",
        custom_persona=req.custom_persona,
        messages=messages_dicts,
    )
    return chat_data


@app.get("/api/chats/{chat_id}")
def get_chat(
    chat_id: str,
    user: dict = Depends(get_current_user),
):
    """Fetch full chat session messages."""
    user_id = user["id"]
    chat_data = db_manager.get_chat_by_id(chat_id, user_id=user_id)
    if not chat_data:
        raise HTTPException(status_code=404, detail="Chat conversation not found")
    return chat_data


@app.put("/api/chats/{chat_id}")
def update_chat(
    chat_id: str,
    req: ChatSessionUpdate,
    user: dict = Depends(get_current_user),
):
    """Update chat title, persona, or message history."""
    user_id = user["id"]
    messages_dicts = [m.dict() for m in req.messages] if req.messages is not None else None
    chat_data = db_manager.save_chat_session(
        chat_id=chat_id,
        user_id=user_id,
        title=req.title,
        persona=req.persona,
        custom_persona=req.custom_persona,
        messages=messages_dicts,
    )
    return chat_data


@app.delete("/api/chats/{chat_id}")
def delete_chat(
    chat_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a chat session."""
    user_id = user["id"]
    deleted = db_manager.delete_chat(chat_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Chat not found or already deleted")
    return {"status": "success", "id": chat_id}


@app.post("/api/chat/stream")
async def chat_stream(
    req: ChatRequest,
    user: Optional[dict] = Depends(get_current_user_optional),
):
    user_id = user["id"] if user else None
    history_dicts = [{"role": m.role, "content": m.content} for m in req.chat_history] if req.chat_history else []
    generator = pipeline.stream_answer_query(
        query=req.query,
        top_k=req.top_k,
        alpha=req.alpha,
        threshold=req.threshold,
        chat_history=history_dicts,
        llm_provider=req.llm_provider,
        user_id=user_id,
        persona=req.persona or "executive",
        custom_persona=req.custom_persona,
        doc_ids=req.doc_ids,
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/chat")
def chat(
    req: ChatRequest,
    user: Optional[dict] = Depends(get_current_user_optional),
):
    user_id = user["id"] if user else None
    history_dicts = [{"role": m.role, "content": m.content} for m in req.chat_history] if req.chat_history else []
    response = pipeline.answer_query(
        query=req.query,
        top_k=req.top_k,
        alpha=req.alpha,
        threshold=req.threshold,
        chat_history=history_dicts,
        llm_provider=req.llm_provider,
        user_id=user_id,
        persona=req.persona or "executive",
        custom_persona=req.custom_persona,
    )
    return response


@app.post("/api/vector-search")
def vector_search(
    req: VectorSearchRequest,
    user: Optional[dict] = Depends(get_current_user_optional),
):
    user_id = user["id"] if user else None
    results = pipeline.retrieve(
        query=req.query,
        top_k=req.top_k,
        alpha=req.alpha,
        threshold=req.threshold,
        user_id=user_id,
        doc_ids=req.doc_ids,
    )
    return {
        "query": req.query,
        "vector_database": "Qdrant",
        "results": [
            {
                "chunk_id": r.chunk_id,
                "doc_name": r.doc_name,
                "chunk_index": r.chunk_index,
                "score": r.score,
                "dense_score": r.dense_score,
                "sparse_score": r.sparse_score,
                "text": r.text,
            }
            for r in results
        ],
    }


@app.post("/api/config")
def update_config(req: ConfigUpdateRequest):
    if req.nvidia_api_key is not None:
        os.environ["NVIDIA_API_KEY"] = req.nvidia_api_key
        os.environ["NVDIA_API"] = req.nvidia_api_key
    if req.gemini_api_key is not None:
        os.environ["GEMINI_API_KEY"] = req.gemini_api_key
        pipeline.embedding_engine.gemini_api_key = req.gemini_api_key
    if req.groq_api_key is not None:
        os.environ["GROQ_API_KEY"] = req.groq_api_key
    if req.openrouter_api_key is not None:
        os.environ["OPENROUTER_API_KEY"] = req.openrouter_api_key

    if req.chunk_size or req.chunk_overlap:
        cs = req.chunk_size or pipeline.chunker.chunk_size
        co = req.chunk_overlap or pipeline.chunker.chunk_overlap
        pipeline.chunker = RecursiveChunker(chunk_size=cs, chunk_overlap=co)

    return {"status": "updated"}


# Mount React SPA Static Assets
if os.path.exists(CLIENT_DIST):
    assets_dir = os.path.join(CLIENT_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_react_app(full_path: str):
        file_path = os.path.join(CLIENT_DIST, full_path)
        if full_path and os.path.exists(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(CLIENT_DIST, "index.html"))

