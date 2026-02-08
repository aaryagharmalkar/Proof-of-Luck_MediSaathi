"""
Zero-content report helpers: download, decrypt, and extract text from stored reports.
Used by reports view and doctors report-summary. No persistent storage of extracted text.
"""
import logging
from typing import Any, Optional

import fitz

logger = logging.getLogger(__name__)

from app.supabase_client import get_supabase_client


def get_report_raw_bytes(report_row: dict) -> Optional[bytes]:
    """
    Get raw PDF bytes for a report: download from storage and decrypt if encrypted.
    report_row must have storage_path; if storage_encrypted is true, decrypts with report_encryption.
    Returns None if unavailable.
    """
    path = (report_row.get("storage_path") or "").strip()
    if not path:
        return None
    try:
        # Use service role so we can download any user's report (for doctors viewing patient reports)
        client = get_supabase_client(use_service_role=True)
        data = client.storage.from_("medical_reports").download(path)
        if not data:
            return None
        encrypted = report_row.get("storage_encrypted") is True
        if encrypted:
            from app.report_encryption import decrypt_pdf
            return decrypt_pdf(bytes(data))
        return bytes(data)
    except Exception as e:
        logger.warning("Report download/decrypt error: %s", e)
        return None


def get_report_full_text(report_row: dict) -> str:
    """
    Get full text for a report: from stored full_text (legacy) or by downloading,
    decrypting if needed, and extracting from PDF. Returns "" if unavailable.
    """
    # Legacy: text stored in DB
    full_text = (report_row.get("full_text") or "").strip()
    if full_text:
        return full_text[:50000]

    raw = get_report_raw_bytes(report_row)
    if not raw:
        return ""

    try:
        doc = fitz.open(stream=raw, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text[:50000]
    except Exception as e:
        logger.warning("PDF text extraction error: %s", e)
        return ""
