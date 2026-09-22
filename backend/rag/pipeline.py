"""
End-to-End RAG (Retrieval-Augmented Generation) Orchestration Pipeline
with Qdrant Vector Store, Real-Time SSE Token Streaming & Multi-Provider Fallbacks.
"""

import os
import io
import json
import time
import asyncio
from typing import List, Dict, Any, Optional, AsyncGenerator
import httpx
from pypdf import PdfReader

import csv
try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

try:
    import openpyxl
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

from .chunker import RecursiveChunker
from .embeddings import EmbeddingEngine
from .vector_store import SearchResult


class RAGPipeline:
    def __init__(
        self,
        vector_db: Optional[Any] = None,
        embedding_engine: Optional[EmbeddingEngine] = None,
        chunk_size: int = 500,
        chunk_overlap: int = 80,
    ):
        self.vector_db = vector_db
        self.embedding_engine = embedding_engine or EmbeddingEngine()
        self.chunker = RecursiveChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    # -------------------------------------------------------------
    # 1. DOCUMENT INGESTION (PDF, DOCX, XLSX, CSV, JSON, TXT)
    # -------------------------------------------------------------
    def extract_text_from_file(self, filename: str, content_bytes: bytes) -> str:
        lower_name = filename.lower()
        
        # 1. PDF Documents
        if lower_name.endswith(".pdf"):
            reader = PdfReader(io.BytesIO(content_bytes))
            text_parts = []
            for page_idx, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    text_parts.append(f"--- Page {page_idx + 1} ---\n{page_text.strip()}")
            return "\n\n".join(text_parts)

        # 2. Microsoft Word (.docx)
        elif lower_name.endswith(".docx"):
            if not HAS_DOCX:
                raise ValueError("python-docx is required to parse .docx documents.")
            doc = docx.Document(io.BytesIO(content_bytes))
            parts = []
            for p in doc.paragraphs:
                if p.text.strip():
                    parts.append(p.text.strip())
            for table in doc.tables:
                table_rows = []
                for row in table.rows:
                    row_text = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
                    if row_text:
                        table_rows.append(row_text)
                if table_rows:
                    parts.append("\n".join(table_rows))
            return "\n\n".join(parts)

        # 3. Microsoft Excel (.xlsx, .xlsm, .xltx)
        elif lower_name.endswith((".xlsx", ".xlsm", ".xltx")):
            if not HAS_OPENPYXL:
                raise ValueError("openpyxl is required to parse Excel spreadsheets.")
            wb = openpyxl.load_workbook(io.BytesIO(content_bytes), data_only=True)
            parts = []
            for sheetname in wb.sheetnames:
                sheet = wb[sheetname]
                sheet_lines = [f"=== Sheet: {sheetname} ==="]
                for row in sheet.iter_rows(values_only=True):
                    row_vals = [str(val).strip() for val in row if val is not None and str(val).strip()]
                    if row_vals:
                        sheet_lines.append(" | ".join(row_vals))
                if len(sheet_lines) > 1:
                    parts.append("\n".join(sheet_lines))
            return "\n\n".join(parts)

        # 4. CSV Files (.csv)
        elif lower_name.endswith(".csv"):
            try:
                decoded = content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                decoded = content_bytes.decode("latin-1", errors="ignore")
            reader = csv.reader(io.StringIO(decoded))
            rows = [" | ".join(col.strip() for col in r if col.strip()) for r in reader]
            return "\n".join([r for r in rows if r])

        # 5. JSON Files (.json)
        elif lower_name.endswith(".json"):
            try:
                decoded = content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                decoded = content_bytes.decode("latin-1", errors="ignore")
            try:
                parsed = json.loads(decoded)
                return json.dumps(parsed, indent=2)
            except Exception:
                return decoded

        # 6. Plain Text / Markdown / Code (.txt, .md, .py, etc.)
        else:
            try:
                return content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                return content_bytes.decode("latin-1", errors="ignore")


    def ingest_document(self, doc_id: str, doc_name: str, text: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        start_time = time.time()
        chunks = self.chunker.chunk_document(doc_id=doc_id, doc_name=doc_name, content=text, metadata=metadata)
        if not chunks:
            return {"doc_id": doc_id, "doc_name": doc_name, "chunk_count": 0, "status": "empty"}

        chunk_texts = [c["text"] for c in chunks]
        embeddings = self.embedding_engine.embed_texts(chunk_texts)
        self.vector_db.add_chunks(chunks, embeddings)

        duration = time.time() - start_time
        print(f"[RAGPipeline] [Ingest] Ingested '{doc_name}' -> {len(chunks)} chunks in {round(duration, 3)}s")
        return {
            "doc_id": doc_id,
            "doc_name": doc_name,
            "chunk_count": len(chunks),
            "char_count": len(text),
            "word_count": len(text.split()),
            "ingestion_time_seconds": round(duration, 3),
            "status": "success",
        }

    # -------------------------------------------------------------
    # 2. HYBRID RETRIEVAL (QDRANT HNSW + BM25)
    # -------------------------------------------------------------
    def retrieve(
        self,
        query: str,
        top_k: int = 4,
        alpha: float = 0.65,
        threshold: float = 0.05,
        user_id: Optional[str] = None,
        doc_ids: Optional[List[str]] = None,
    ) -> List[SearchResult]:
        query_vector = self.embedding_engine.embed_query(query)
        return self.vector_db.search_hybrid(
            query=query,
            query_vector=query_vector,
            top_k=top_k,
            alpha=alpha,
            threshold=threshold,
            user_id=user_id,
            doc_ids=doc_ids,
        )

    def _is_volatile_or_prohibited(self, text: str) -> bool:
        """
        Fast content moderation pre-screener for abusive, volatile, sexually explicit,
        and dark/harmful content.
        """
        if not text:
            return False
        import re
        # Comprehensive safety filter covering abusive language, profanity, sexually explicit/NSFW terms, and violent/dark concepts
        pattern = re.compile(
            r"\b("
            # Explicit / sexual / NSFW terms
            r"sex|sexual|porn|pornography|nude|nudity|erotic|xxx|nsfw|fetish|incest|"
            r"penis|vagina|boobs|tits|orgasm|clitoris|intercourse|prostitute|escort|"
            # Abusive / profane words / slurs / vulgarities
            r"fuck|fucking|fucker|motherfucker|bitch|bastard|asshole|dick|cock|pussy|cunt|"
            r"whore|slut|douche|prick|retard|faggot|nigger|nigga|chink|kike|spic|"
            # Dark / violent / hate / self-harm terms
            r"kill yourself|suicide|self-harm|murder|rape|rapist|terrorism|terrorist|bombing|"
            r"genocide|behead|torture|child abuse|pedophile"
            r")\b",
            re.IGNORECASE,
        )
        return bool(pattern.search(text))

    def _build_system_prompt(self, persona: Optional[str], custom_persona: Optional[str], context_blocks: List[str]) -> str:
        persona_instructions = {
            "executive": (
                "Persona: Executive Enterprise Analyst.\n"
                "Tone & Style: High-level executive summaries, strategic takeaways, actionable bullet points, "
                "and business impact. Be structured, concise, and decisive."
            ),
            "architect": (
                "Persona: Principal Technical & Systems Architect.\n"
                "Tone & Style: Deep technical breakdowns, detailed architectural dataflows, schemas, "
                "code implementations, protocol specifications, and engineering trade-offs."
            ),
            "researcher": (
                "Persona: Precision Research Scholar & Fact-Checker.\n"
                "Tone & Style: Exhaustively detailed, evidence-backed analysis citing exact numbers, metrics, "
                "dates, definitions, and verbatim quotes with rigorous factual accuracy."
            ),
            "tutor": (
                "Persona: Interactive AI Tutor & Knowledge Mentor.\n"
                "Tone & Style: Clear, engaging step-by-step reasoning with intuitive analogies, beginner-friendly "
                "breakdowns, key terms glossary, and interactive learning takeaways."
            ),
        }

        active_persona_text = persona_instructions.get(persona or "executive", persona_instructions["executive"])
        if persona == "custom" and custom_persona and custom_persona.strip():
            active_persona_text = f"Custom Persona Instructions:\n{custom_persona.strip()}"

        return (
            "You are a precision AI Knowledge Assistant powered by Retrieval-Augmented Generation (RAG) and Qdrant.\n"
            f"{active_persona_text}\n\n"
            "STRICT SAFETY & CONTENT POLICY (NON-NEGOTIABLE):\n"
            "- Under NO circumstances generate, process, or answer queries that contain abusive language, profanity, "
            "vulgarity, sexually explicit / NSFW topics, dark or violent concepts, hate speech, or harassment.\n"
            "- If the user prompt or query contains ANY volatile, abusive, sexual, or prohibited language, you MUST "
            "refuse to assist and respond ONLY with: \"I am sorry, but I cannot help with that as it contains inappropriate or prohibited language.\"\n"
            "- Do NOT elaborate on prohibited concepts, do NOT repeat abusive words, and do NOT offer partial assistance on volatile topics.\n\n"
            "Core RAG Rules:\n"
            "1. Ground your answers strictly in the provided context.\n"
            "2. Cite your sources directly using citation tags like [1], [2] corresponding to the chunk numbers.\n"
            "3. If the context does not contain enough information, state clearly what is missing.\n"
            "4. Format your answer with clean Markdown (bullet points, bold headers, code snippets if relevant).\n\n"
            f"=== RETRIEVED KNOWLEDGE CONTEXT ===\n" + "\n\n".join(context_blocks) + "\n====================================="
        )

    # -------------------------------------------------------------
    # 3. REAL-TIME STREAMING GENERATION (SSE)
    # -------------------------------------------------------------
    async def stream_answer_query(
        self,
        query: str,
        top_k: int = 4,
        alpha: float = 0.65,
        threshold: float = 0.05,
        chat_history: Optional[List[Dict[str, str]]] = None,
        llm_provider: str = "auto",
        user_id: Optional[str] = None,
        persona: Optional[str] = "executive",
        custom_persona: Optional[str] = None,
        doc_ids: Optional[List[str]] = None,
    ) -> AsyncGenerator[str, None]:
        start_time = time.time()
        print(f"\n========================================================")
        print(f"[RAGPipeline Stream] [Search] User Query: '{query}' (user: {user_id}, persona: {persona}, doc_ids: {doc_ids})")

        # 1. Content Moderation & Safety Guardrail Pre-Check
        if self._is_volatile_or_prohibited(query):
            print(f"[RAGPipeline Stream] [Warning] Prohibited volatile/abusive content detected in query: '{query}'")
            yield f"data: {json.dumps({'type': 'init', 'provider': 'Content Moderation Guard', 'citations': [], 'chunks': []})}\n\n"
            yield f"data: {json.dumps({'type': 'token', 'content': 'I am sorry, but I cannot help with that as it contains inappropriate or prohibited language.'})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'latency': 0.01, 'confidence': 0.0, 'provider': 'Content Moderation Guard'})}\n\n"
            return

        retrieved_chunks = self.retrieve(
            query=query,
            top_k=top_k,
            alpha=alpha,
            threshold=threshold,
            user_id=user_id,
            doc_ids=doc_ids,
        )

        if not retrieved_chunks:
            yield f"data: {json.dumps({'type': 'init', 'provider': 'none', 'citations': [], 'chunks': []})}\n\n"
            yield f"data: {json.dumps({'type': 'token', 'content': 'I could not find any relevant information in the uploaded knowledge base to answer your question. Please make sure you have loaded or uploaded documents first.'})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'latency': 0.0, 'confidence': 0.0, 'provider': 'none'})}\n\n"
            return

        citations = []
        context_blocks = []
        for i, res in enumerate(retrieved_chunks):
            citation_id = f"[{i + 1}]"
            context_blocks.append(f"--- Context Chunk {citation_id} (Source: {res.doc_name}, Chunk #{res.chunk_index}) ---\n{res.text}")
            citations.append({
                "citation_id": citation_id,
                "doc_id": res.doc_id,
                "doc_name": res.doc_name,
                "chunk_index": res.chunk_index,
                "chunk_id": res.chunk_id,
                "score": res.score,
                "dense_score": res.dense_score,
                "sparse_score": res.sparse_score,
                "snippet": res.text[:180] + ("..." if len(res.text) > 180 else ""),
                "cloudinary_url": res.metadata.get("cloudinary_url") if res.metadata else None,
            })

        system_prompt = self._build_system_prompt(persona, custom_persona, context_blocks)

        avg_score = sum(c.score for c in retrieved_chunks) / len(retrieved_chunks)
        confidence = round(min(1.0, avg_score * 1.25), 2)

        # Emit initial metadata with citations immediately
        yield f"data: {json.dumps({'type': 'init', 'provider': 'Streaming...', 'citations': citations, 'chunks': [{'doc_name': c.doc_name, 'chunk_index': c.chunk_index, 'score': c.score} for c in retrieved_chunks]})}\n\n"

        provider_name = "Built-in Local Synthesizer"
        stream_success = False

        nvidia_key = os.getenv("NVIDIA_API_KEY") or os.getenv("NVDIA_API")
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        groq_key = os.getenv("GROQ_API_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY")

        # 1. Try NVIDIA NIM AI Streaming (Priority High-Speed Enterprise Engine)
        if nvidia_key and not stream_success and (llm_provider in ["auto", "nvidia"]):
            for model_name in [
                "meta/llama-3.2-11b-vision-instruct",
                "meta/llama-3.2-90b-vision-instruct",
                "nvidia/llama-3.1-nemotron-70b-instruct",
                "deepseek-ai/deepseek-v4.1-flash",
                "mistralai/mistral-large-2-instruct",
            ]:
                try:
                    async for token in self._stream_nvidia(system_prompt, query, chat_history or [], nvidia_key, model_name):
                        if not stream_success:
                            provider_name = f"NVIDIA NIM ({model_name})"
                            yield f"data: {json.dumps({'type': 'provider', 'provider': provider_name})}\n\n"
                            stream_success = True
                        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                    if stream_success:
                        break
                except Exception as e:
                    print(f"[RAGPipeline Stream] NVIDIA NIM [{model_name}] error ({e}), trying next...")

        # 2. Try OpenRouter Streaming
        if openrouter_key and not stream_success and (llm_provider in ["auto", "openrouter"]):
            for model_name in [
                "nvidia/nemotron-3-ultra-550b-a55b:free",
                "poolside/laguna-s-2.1:free",
                "inclusionai/ling-3.0-flash-fin:free",
                "nvidia/nemotron-3.5-lightning:free",
                "meta-llama/llama-3.3-70b-instruct",
                "deepseek/deepseek-chat",
                "google/gemini-2.0-flash-001",
                "mistralai/mistral-7b-instruct",
                "openai/gpt-4o-mini",
            ]:
                try:
                    async for token in self._stream_openrouter(system_prompt, query, chat_history or [], openrouter_key, model_name):
                        if not stream_success:
                            provider_name = f"OpenRouter ({model_name})"
                            yield f"data: {json.dumps({'type': 'provider', 'provider': provider_name})}\n\n"
                            stream_success = True
                        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                    if stream_success:
                        break
                except Exception as e:
                    print(f"[RAGPipeline Stream] OpenRouter [{model_name}] error ({e}), trying next...")

        # 3. Try Groq Streaming
        if groq_key and not stream_success and (llm_provider in ["auto", "groq"]):
            for model_name in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"]:
                try:
                    async for token in self._stream_groq(system_prompt, query, chat_history or [], groq_key, model_name):
                        if not stream_success:
                            provider_name = f"Groq ({model_name})"
                            yield f"data: {json.dumps({'type': 'provider', 'provider': provider_name})}\n\n"
                            stream_success = True
                        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                    if stream_success:
                        break
                except Exception as e:
                    print(f"[RAGPipeline Stream] Groq [{model_name}] error ({e}), trying next...")

        # 4. Try Gemini Streaming
        if gemini_key and not stream_success and (llm_provider in ["auto", "gemini"]):
            for model_name in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]:
                try:
                    async for token in self._stream_gemini(system_prompt, query, chat_history or [], gemini_key, model_name):
                        if not stream_success:
                            provider_name = f"Gemini ({model_name})"
                            yield f"data: {json.dumps({'type': 'provider', 'provider': provider_name})}\n\n"
                            stream_success = True
                        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                    if stream_success:
                        break
                except Exception as e:
                    print(f"[RAGPipeline Stream] Gemini [{model_name}] error ({e}), trying next...")

        # 5. Fallback: Smooth Real-Time Local Token Streaming
        if not stream_success:
            provider_name = "Built-in Local Synthesizer"
            yield f"data: {json.dumps({'type': 'provider', 'provider': provider_name})}\n\n"
            local_ans = self._local_grounded_synthesizer(query, retrieved_chunks)
            words = local_ans.split(" ")
            for w in words:
                yield f"data: {json.dumps({'type': 'token', 'content': w + ' '})}\n\n"
                await asyncio.sleep(0.04)  # Paced streaming rhythm

        duration = round(time.time() - start_time, 3)
        print(f"[RAGPipeline Stream] [OK] Completed via {provider_name} in {duration}s")
        print(f"========================================================\n")
        yield f"data: {json.dumps({'type': 'done', 'latency': duration, 'confidence': confidence, 'provider': provider_name})}\n\n"

    async def _stream_nvidia(self, system_prompt: str, query: str, history: List[Dict[str, str]], api_key: str, model: str):
        url = "https://integrate.api.nvidia.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        messages = [{"role": "system", "content": system_prompt}]
        for h in history[-4:]:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": query})

        async with httpx.AsyncClient(timeout=25.0) as client:
            async with client.stream(
                "POST", url, headers=headers, json={"model": model, "messages": messages, "temperature": 0.2, "stream": True}
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.startswith("data: ") and line.strip() != "data: [DONE]":
                        try:
                            payload = json.loads(line[6:])
                            delta = payload["choices"][0].get("delta", {}).get("content", "")
                            if delta:
                                yield delta
                        except Exception:
                            continue

    async def _stream_openrouter(self, system_prompt: str, query: str, history: List[Dict[str, str]], api_key: str, model: str):
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "NexusRAG Knowledge Assistant",
        }
        messages = [{"role": "system", "content": system_prompt}]
        for h in history[-4:]:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": query})

        async with httpx.AsyncClient(timeout=25.0) as client:
            async with client.stream(
                "POST", url, headers=headers, json={"model": model, "messages": messages, "temperature": 0.2, "stream": True}
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.startswith("data: ") and line.strip() != "data: [DONE]":
                        try:
                            payload = json.loads(line[6:])
                            delta = payload["choices"][0].get("delta", {}).get("content", "")
                            if delta:
                                yield delta
                        except Exception:
                            continue

    async def _stream_groq(self, system_prompt: str, query: str, history: List[Dict[str, str]], api_key: str, model: str):
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        messages = [{"role": "system", "content": system_prompt}]
        for h in history[-4:]:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": query})

        async with httpx.AsyncClient(timeout=25.0) as client:
            async with client.stream(
                "POST", url, headers=headers, json={"model": model, "messages": messages, "temperature": 0.2, "stream": True}
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.startswith("data: ") and line.strip() != "data: [DONE]":
                        try:
                            payload = json.loads(line[6:])
                            delta = payload["choices"][0].get("delta", {}).get("content", "")
                            if delta:
                                yield delta
                        except Exception:
                            continue

    async def _stream_gemini(self, system_prompt: str, query: str, history: List[Dict[str, str]], api_key: str, model: str):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse"
        headers = {"Content-Type": "application/json"}
        if api_key.startswith("AQ."):
            headers["Authorization"] = f"Bearer {api_key}"
        else:
            url += f"&key={api_key}"

        contents = []
        contents.append({"role": "user", "parts": [{"text": system_prompt + "\n\nPlease confirm you understand."}]})
        contents.append({"role": "model", "parts": [{"text": "Understood. I will provide accurate answers strictly citing the provided context."}]})

        for h in history[-4:]:
            r = "user" if h.get("role") == "user" else "model"
            contents.append({"role": r, "parts": [{"text": h.get("content", "")}]})
        contents.append({"role": "user", "parts": [{"text": query}]})

        async with httpx.AsyncClient(timeout=25.0) as client:
            async with client.stream("POST", url, headers=headers, json={"contents": contents}) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            payload = json.loads(line[6:])
                            cands = payload.get("candidates", [])
                            if cands:
                                parts = cands[0].get("content", {}).get("parts", [])
                                for p in parts:
                                    t = p.get("text", "")
                                    if t:
                                        yield t
                        except Exception:
                            continue

    def _local_grounded_synthesizer(self, query: str, chunks: List[SearchResult]) -> str:
        key_sentences = []
        q_words = set(query.lower().split())

        for idx, chunk in enumerate(chunks):
            citation_tag = f"[{idx + 1}]"
            sentences = [s.strip() for s in chunk.text.replace("\n", " ").split(". ") if s.strip()]
            for s in sentences:
                s_words = set(s.lower().split())
                overlap = len(q_words.intersection(s_words))
                if overlap > 0:
                    key_sentences.append((overlap, f"{s} {citation_tag}"))

        key_sentences.sort(key=lambda x: x[0], reverse=True)
        top_sentences = [s[1] for s in key_sentences[:5]]

        if not top_sentences:
            return (
                f"Based on the retrieved documents ([1] **{chunks[0].doc_name}**):\n\n"
                f"{chunks[0].text[:300]}... [1]"
            )

        response_body = " ".join(top_sentences)
        return (
            f"### Grounded Response\n\n"
            f"{response_body}\n\n"
            f"**Sources Referenced:**\n" +
            "\n".join([f"- **[{i+1}] {c.doc_name}** (Chunk #{c.chunk_index}, Relevance: {int(c.score * 100)}%)" for i, c in enumerate(chunks)])
        )

    def answer_query(
        self,
        query: str,
        top_k: int = 4,
        alpha: float = 0.65,
        threshold: float = 0.05,
        chat_history: Optional[List[Dict[str, str]]] = None,
        llm_provider: str = "auto",
        user_id: Optional[str] = None,
        persona: Optional[str] = "executive",
        custom_persona: Optional[str] = None,
    ) -> Dict[str, Any]:
        start_time = time.time()
        if self._is_volatile_or_prohibited(query):
            return {
                "answer": "I am sorry, but I cannot help with that as it contains inappropriate or prohibited language.",
                "citations": [],
                "confidence_score": 0.0,
                "latency_seconds": 0.01,
                "model_used": "Content Moderation Guard",
            }

        retrieved_chunks = self.retrieve(query=query, top_k=top_k, alpha=alpha, threshold=threshold, user_id=user_id)
        if not retrieved_chunks:
            return {
                "answer": "I could not find any relevant information in the uploaded knowledge base to answer your question.",
                "citations": [],
                "confidence_score": 0.0,
                "latency_seconds": round(time.time() - start_time, 3),
                "model_used": "none",
            }

        citations = [
            {
                "citation_id": f"[{i + 1}]",
                "doc_id": res.doc_id,
                "doc_name": res.doc_name,
                "chunk_index": res.chunk_index,
                "chunk_id": res.chunk_id,
                "score": res.score,
                "snippet": res.text[:180],
                "cloudinary_url": res.metadata.get("cloudinary_url") if res.metadata else None,
            }
            for i, res in enumerate(retrieved_chunks)
        ]
        answer_text = self._local_grounded_synthesizer(query, retrieved_chunks)
        avg_score = sum(c.score for c in retrieved_chunks) / len(retrieved_chunks)

        return {
            "answer": answer_text,
            "citations": citations,
            "confidence_score": round(min(1.0, avg_score * 1.25), 2),
            "latency_seconds": round(time.time() - start_time, 3),
            "model_used": "Built-in Local Synthesizer",
        }
