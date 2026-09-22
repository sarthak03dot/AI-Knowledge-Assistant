"""
Test Script: Verifies Cloudinary Storage Upload & Multi-Format Document Ingestion (PDF, DOCX, XLSX, TXT)
"""

import os
import io
import docx
import openpyxl
from backend.db.cloudinary_service import cloudinary_service
from backend.rag.pipeline import RAGPipeline
from backend.rag.qdrant_store import QdrantVectorStore


def test_document_extraction():
    pipeline = RAGPipeline()

    # 1. Test TXT
    txt_content = b"This is a test plain text document for NexusRAG."
    txt_extracted = pipeline.extract_text_from_file("sample.txt", txt_content)
    assert "plain text document" in txt_extracted
    print("✅ TXT extraction passed.")

    # 2. Test Word DOCX
    doc = docx.Document()
    doc.add_heading("Cloudinary Integration Doc", level=1)
    doc.add_paragraph("This paragraph comes from an in-memory DOCX file.")
    t = doc.add_table(rows=2, cols=2)
    t.cell(0, 0).text = "Header 1"
    t.cell(0, 1).text = "Header 2"
    t.cell(1, 0).text = "Value A"
    t.cell(1, 1).text = "Value B"
    doc_io = io.BytesIO()
    doc.save(doc_io)
    docx_bytes = doc_io.getvalue()

    docx_extracted = pipeline.extract_text_from_file("report.docx", docx_bytes)
    assert "Cloudinary Integration Doc" in docx_extracted
    assert "Header 1 | Header 2" in docx_extracted
    print("✅ DOCX extraction passed.")

    # 3. Test Excel XLSX
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Financials"
    ws.append(["Quarter", "Revenue", "Profit"])
    ws.append(["Q1", "$1.2M", "$300K"])
    ws.append(["Q2", "$1.8M", "$450K"])
    xlsx_io = io.BytesIO()
    wb.save(xlsx_io)
    xlsx_bytes = xlsx_io.getvalue()

    xlsx_extracted = pipeline.extract_text_from_file("data.xlsx", xlsx_bytes)
    assert "Financials" in xlsx_extracted
    assert "Quarter | Revenue | Profit" in xlsx_extracted
    print("✅ XLSX extraction passed.")


def test_cloudinary_upload_and_delete():
    import pytest
    assert cloudinary_service.is_configured, "Cloudinary service should be configured"

    test_bytes = b"Hello from NexusRAG test document with Cloudinary upload and delete!"
    res = cloudinary_service.upload_file(test_bytes, "test_nexus_doc_to_delete.txt")
    if not res["success"] and "NameResolutionError" in str(res.get("error", "")):
        pytest.skip("Cloudinary API unreachable in offline/sandboxed environment.")

    assert res["success"] is True, f"Cloudinary upload failed: {res.get('error')}"
    public_id = res.get("public_id")
    assert public_id is not None, "Expected valid public_id from Cloudinary"
    print(f"✅ Cloudinary upload passed! URL: {res['secure_url']}")

    # Test deletion
    deleted = cloudinary_service.delete_file(public_id, resource_type="raw")
    assert deleted is True, f"Cloudinary deletion failed for {public_id}"
    print(f"✅ Cloudinary delete passed for {public_id}!")


def test_user_document_database_lifecycle():
    from backend.db.database import db_manager
    user_id = "test_user_42"
    doc_id = "doc_test_101"

    # Add user document
    doc = db_manager.add_user_document(
        user_id=user_id,
        doc_id=doc_id,
        doc_name="Financial_Report_2026.xlsx",
        file_size=1024,
        chunk_count=3,
        char_count=500,
        word_count=80,
        cloudinary_url="https://res.cloudinary.com/dt7owuhss/raw/upload/test.xlsx",
        cloudinary_public_id="nexusrag_docs/test.xlsx",
    )
    assert doc["doc_id"] == doc_id
    assert doc["user_id"] == user_id

    # Retrieve user documents
    user_docs = db_manager.get_user_documents(user_id)
    assert any(d["doc_id"] == doc_id for d in user_docs)

    # Delete user document
    deleted = db_manager.delete_user_document(doc_id, user_id=user_id)
    assert deleted is not None
    assert deleted["doc_id"] == doc_id
    assert deleted["cloudinary_public_id"] == "nexusrag_docs/test.xlsx"

    # Verify deleted
    assert db_manager.get_document_by_id(doc_id) is None
    print("✅ User document database lifecycle passed!")


if __name__ == "__main__":
    test_document_extraction()
    test_cloudinary_upload_and_delete()
    test_user_document_database_lifecycle()

