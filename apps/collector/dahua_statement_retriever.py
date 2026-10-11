#!/usr/bin/env python3
"""Read Dahua TM-A statement records over TCP without changing scale state.

This utility implements only the documented statement-collection request:
    !0J####A + CR LF ETX

It never sends PLU, clock, parameter, financial-record, or clear-record commands.
Run --show-command first, then collect a very small range while the scale is idle.
"""

from __future__ import annotations

import argparse
import json
import socket
import sys
from dataclasses import asdict, dataclass

TERMINATOR = b"\x0d\x0a\x03"
ETX = b"\x03"
DEFAULT_PORT = 4001


class DahuaProtocolError(RuntimeError):
    pass


@dataclass(frozen=True)
class StatementRecord:
    sequence: int
    sale_time_yymmddhhmm: str
    weighing_mode: str
    month: int
    department: str
    store: str
    plu_sequence: str
    weight_raw: str
    unit_price_raw: str
    total_before_discount_raw: str
    total_after_discount_raw: str
    undocumented_tail: str
    raw_response: str


def build_statement_command(sequence: int) -> bytes:
    if not 0 <= sequence <= 9999:
        raise ValueError("statement sequence must be from 0 through 9999")
    return f"!0J{sequence:04d}A".encode("ascii") + TERMINATOR


def receive_reply(connection: socket.socket) -> bytes:
    chunks: list[bytes] = []
    while True:
        chunk = connection.recv(4096)
        if not chunk:
            break
        chunks.append(chunk)
        if ETX in chunk:
            break
    reply = b"".join(chunks)
    if not reply:
        raise DahuaProtocolError("scale closed the connection without a response")
    if ETX not in reply:
        raise DahuaProtocolError("response did not contain ETX terminator")
    return reply[: reply.index(ETX) + 1]


def request_statement(host: str, port: int, sequence: int, timeout: float) -> bytes:
    with socket.create_connection((host, port), timeout=timeout) as connection:
        connection.settimeout(timeout)
        connection.sendall(build_statement_command(sequence))
        return receive_reply(connection)


def parse_statement_reply(reply: bytes, requested_sequence: int) -> StatementRecord | None:
    try:
        text = reply.rstrip(b"\x03\r\n").decode("ascii")
    except UnicodeDecodeError as error:
        raise DahuaProtocolError("response is not ASCII; preserve it with --raw and inspect it") from error

    expected_no_data = f"0j{requested_sequence:04d}ac"
    if text.lower() == expected_no_data:
        return None
    if len(text) < 50 or text[:2].lower() != "0j" or text[6:7].lower() != "a":
        raise DahuaProtocolError(f"unexpected statement response: {text!r}")

    sequence_text = text[2:6]
    if not sequence_text.isdecimal():
        raise DahuaProtocolError("statement response has a non-numeric sequence")
    if int(sequence_text) != requested_sequence:
        raise DahuaProtocolError("statement response sequence does not match the request")

    timestamp = text[7:17]
    if not timestamp.isdecimal():
        raise DahuaProtocolError("statement response has an invalid YYMMDDhhmm timestamp")
    encoded_month = int(timestamp[2:4])
    return StatementRecord(
        sequence=int(sequence_text),
        sale_time_yymmddhhmm=timestamp,
        weighing_mode="piece-counting" if encoded_month // 16 else "weighing",
        month=encoded_month % 16,
        department=text[17:19],
        store=text[19:21],
        plu_sequence=text[21:25],
        weight_raw=text[25:30],
        unit_price_raw=text[30:36],
        total_before_discount_raw=text[36:43],
        total_after_discount_raw=text[43:50],
        undocumented_tail=text[50:],
        raw_response=text,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", required=True, help="Private LAN IP or hostname of the Dahua scale")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--start", type=int, default=1, help="First 4-digit statement sequence")
    parser.add_argument("--end", type=int, help="Last sequence, inclusive; default is --start")
    parser.add_argument("--timeout", type=float, default=5.0)
    parser.add_argument("--show-command", action="store_true", help="Print the exact bytes and exit without networking")
    parser.add_argument("--raw", action="store_true", help="Include response bytes as hexadecimal")
    args = parser.parse_args()
    end = args.start if args.end is None else args.end
    if end < args.start:
        parser.error("--end must be greater than or equal to --start")

    if args.show_command:
        command = build_statement_command(args.start)
        print(json.dumps({"sequence": args.start, "ascii": command.decode("ascii", errors="backslashreplace"), "hex": command.hex(" ")}))
        return 0

    for sequence in range(args.start, end + 1):
        reply = request_statement(args.host, args.port, sequence, args.timeout)
        record = parse_statement_reply(reply, sequence)
        output: dict[str, object] = {"sequence": sequence, "result": "no-data" if record is None else "record"}
        if record is not None:
            output["record"] = asdict(record)
        if args.raw:
            output["response_hex"] = reply.hex(" ")
        print(json.dumps(output, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, DahuaProtocolError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(2)
