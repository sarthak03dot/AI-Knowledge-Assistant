"""
Recursive Text Chunker with Sliding Window Overlap.

Why Chunking Matters in RAG:
1. LLMs have finite context windows.
2. Vector embeddings represent focused semantic spaces; smaller, cohesive chunks produce
   sharper vector representations than whole multi-page documents.
3. Sliding window overlap ensures no semantic context is severed across boundary splits.
"""

from typing import List, Dict, Any
import re


class RecursiveChunker:
    """
    Splits text recursively by trying higher-level semantic separators first
    (paragraphs, double newlines), then line breaks, sentences, and finally words.
    """

    DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", "? ", "! ", "; ", " ", ""]

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 80):
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be strictly less than chunk_size")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_text(self, text: str, separators: List[str] = None) -> List[str]:
        """
        Recursively splits text into chunks of at most `chunk_size` characters
        with `chunk_overlap` character overlap.
        """
        if not text or not text.strip():
            return []

        if separators is None:
            separators = self.DEFAULT_SEPARATORS

        return self._split(text.strip(), separators)

    def _split(self, text: str, separators: List[str]) -> List[str]:
        # If the text is already small enough, return it
        if len(text) <= self.chunk_size:
            return [text] if text.strip() else []

        # Find the first separator that appears in the text
        chosen_sep = ""
        new_separators = []
        for i, sep in enumerate(separators):
            if sep == "":
                chosen_sep = ""
                new_separators = []
                break
            if sep in text:
                chosen_sep = sep
                new_separators = separators[i + 1:]
                break

        # Split text by chosen separator
        if chosen_sep == "":
            splits = list(text)
        else:
            splits = text.split(chosen_sep)

        # Merge splits into chunks with overlap
        chunks = []
        current_chunk = []
        current_len = 0

        for split in splits:
            split_len = len(split) + (len(chosen_sep) if current_chunk else 0)

            if current_len + split_len > self.chunk_size:
                if current_chunk:
                    chunk_text = chosen_sep.join(current_chunk).strip()
                    if chunk_text:
                        chunks.append(chunk_text)

                    # Build overlap from the end of the previous chunk
                    overlap_acc = []
                    overlap_len = 0
                    for item in reversed(current_chunk):
                        if overlap_len + len(item) + len(chosen_sep) <= self.chunk_overlap:
                            overlap_acc.insert(0, item)
                            overlap_len += len(item) + len(chosen_sep)
                        else:
                            break
                    current_chunk = overlap_acc
                    current_len = sum(len(x) for x in current_chunk) + (len(chosen_sep) * max(0, len(current_chunk) - 1))

                # If a single piece is itself larger than chunk_size, recurse down
                if len(split) > self.chunk_size and new_separators:
                    sub_chunks = self._split(split, new_separators)
                    chunks.extend(sub_chunks)
                    current_chunk = []
                    current_len = 0
                else:
                    current_chunk.append(split)
                    current_len += len(split) + (len(chosen_sep) if len(current_chunk) > 1 else 0)
            else:
                current_chunk.append(split)
                current_len += split_len

        if current_chunk:
            final_text = chosen_sep.join(current_chunk).strip()
            if final_text and (not chunks or final_text != chunks[-1]):
                chunks.append(final_text)

        return chunks

    def chunk_document(self, doc_id: str, doc_name: str, content: str, metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Takes raw document content and returns a list of chunk metadata dictionaries.
        """
        raw_chunks = self.split_text(content)
        chunked_items = []

        char_offset = 0
        for idx, chunk_text in enumerate(raw_chunks):
            # Attempt to locate character offset in source text
            pos = content.find(chunk_text[:30], char_offset)
            start_pos = pos if pos != -1 else char_offset
            end_pos = start_pos + len(chunk_text)
            char_offset = start_pos

            chunk_meta = {
                "chunk_id": f"{doc_id}_chunk_{idx}",
                "doc_id": doc_id,
                "doc_name": doc_name,
                "chunk_index": idx,
                "total_chunks": len(raw_chunks),
                "text": chunk_text,
                "char_count": len(chunk_text),
                "word_count": len(chunk_text.split()),
                "start_char": start_pos,
                "end_char": end_pos,
                "extra": metadata or {},
            }
            chunked_items.append(chunk_meta)

        return chunked_items
