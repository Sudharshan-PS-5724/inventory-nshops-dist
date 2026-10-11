from __future__ import annotations

import socket


class ProtocolVerificationRequired(RuntimeError):
    """Raised instead of guessing at a vendor response layout."""


def statement_request(record_number: int) -> bytes:
    if record_number < 0 or record_number > 9999:
        raise ValueError("record_number must be between 0 and 9999")
    return f"!0J{record_number:04d}A\r\n".encode("ascii") + b"\x03"


def read_statement_reply(host: str, port: int, record_number: int, timeout_seconds: float = 5.0) -> bytes:
    """Issue the documented read-only request and return raw bytes unchanged."""
    with socket.create_connection((host, port), timeout=timeout_seconds) as connection:
        connection.settimeout(timeout_seconds)
        connection.sendall(statement_request(record_number))
        chunks: list[bytes] = []
        while True:
            chunk = connection.recv(4096)
            if not chunk:
                break
            chunks.append(chunk)
            if b"\x03" in chunk:
                break
        return b"".join(chunks)


def parse_statement_reply(_: bytes) -> None:
    raise ProtocolVerificationRequired(
        "Dahua response parsing is disabled until a captured production-model fixture verifies the field layout."
    )
