"""
Pydantic Schemas for API Requests and Responses.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    id: Optional[str] = None
    role: str
    content: str
    citations: Optional[List[Dict[str, Any]]] = None
    model: Optional[str] = None
    latency: Optional[float] = None
    confidence: Optional[float] = None
    timestamp: Optional[float] = None


class ChatSessionCreate(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = "New Conversation"
    persona: Optional[str] = "executive"  # 'executive', 'architect', 'researcher', 'tutor', 'custom'
    custom_persona: Optional[str] = None
    messages: Optional[List[ChatMessage]] = None


class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    persona: Optional[str] = None
    custom_persona: Optional[str] = None
    messages: Optional[List[ChatMessage]] = None


class ChatRequest(BaseModel):
    query: str
    top_k: int = Field(default=4, ge=1, le=20)
    alpha: float = Field(default=0.65, ge=0.0, le=1.0)
    threshold: float = Field(default=0.05, ge=0.0, le=1.0)
    chat_history: Optional[List[ChatMessage]] = None
    llm_provider: str = "auto"  # 'auto', 'nvidia', 'groq', 'gemini', 'openrouter', 'local'
    chat_id: Optional[str] = None
    persona: Optional[str] = "executive"
    custom_persona: Optional[str] = None
    doc_ids: Optional[List[str]] = None


class VectorSearchRequest(BaseModel):
    query: str
    top_k: int = Field(default=5, ge=1, le=50)
    alpha: float = Field(default=0.65, ge=0.0, le=1.0)
    threshold: float = Field(default=0.0, ge=0.0, le=1.0)
    doc_ids: Optional[List[str]] = None


class DocumentIngestTextRequest(BaseModel):
    doc_name: str
    content: str
    metadata: Optional[Dict[str, Any]] = None


class ConfigUpdateRequest(BaseModel):
    nvidia_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
