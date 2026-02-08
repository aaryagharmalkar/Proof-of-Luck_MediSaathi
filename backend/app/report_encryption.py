"""
Report file encryption for zero-content strategy.
- Encrypt: raw PDF bytes -> (encrypted_bytes with 12-byte nonce prepended)
- Decrypt: encrypted_bytes -> raw PDF bytes
Uses AES-256-GCM. Key from settings.report_encryption_key (32 bytes).
"""
import os
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


NONCE_LENGTH = 12
KEY_LENGTH = 32


def _get_key() -> bytes:
    from app.config import settings
    raw = (settings.report_encryption_key or "").strip()
    if not raw:
        raise ValueError("report_encryption_key is not set; cannot encrypt/decrypt reports")
    # Support hex (64 chars) or raw base64
    if len(raw) == 64 and all(c in "0123456789abcdefABCDEF" for c in raw):
        return bytes.fromhex(raw)
    try:
        import base64
        return base64.urlsafe_b64decode(raw + "==") if len(raw) % 4 else base64.urlsafe_b64decode(raw)
    except Exception:
        pass
    # Use first 32 bytes of string as key (for dev only; prefer hex/base64)
    return raw.encode("utf-8")[:KEY_LENGTH].ljust(KEY_LENGTH, b"\0")


def encrypt_pdf(data: bytes) -> bytes:
    """Encrypt PDF bytes. Returns nonce (12) + ciphertext."""
    key = _get_key()
    if len(key) != KEY_LENGTH:
        key = (key + b"\0" * KEY_LENGTH)[:KEY_LENGTH]
    aes = AESGCM(key)
    nonce = os.urandom(NONCE_LENGTH)
    ct = aes.encrypt(nonce, data, None)
    return nonce + ct


def decrypt_pdf(encrypted: bytes) -> bytes:
    """Decrypt bytes (nonce + ciphertext) to PDF bytes."""
    if len(encrypted) < NONCE_LENGTH:
        raise ValueError("Invalid encrypted payload: too short")
    nonce = encrypted[:NONCE_LENGTH]
    ct = encrypted[NONCE_LENGTH:]
    key = _get_key()
    if len(key) != KEY_LENGTH:
        key = (key + b"\0" * KEY_LENGTH)[:KEY_LENGTH]
    aes = AESGCM(key)
    return aes.decrypt(nonce, ct, None)


def is_encryption_available() -> bool:
    try:
        _get_key()
        return True
    except Exception:
        return False
