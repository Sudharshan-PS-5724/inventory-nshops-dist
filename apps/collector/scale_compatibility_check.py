#!/usr/bin/env python3
"""Evidence-gathering tool for the supplied TM-A and RS-232 documents.

No scanning, PLU writes, clearing, database access, or automatic stock updates.
See scale-compatibility-guide.md before using this on a real scale.
"""

from __future__ import annotations

import argparse
import decimal
import json
import re
import socket
import sys
import time
from typing import Any

MAX_CAPTURE = 16384
DISPLAY_BYTES = 512
SAMPLE_LIMIT = 3


def decimal_string(value: int, places: int) -> str:
    return format(decimal.Decimal(value).scaleb(-places), "f")


def bcd_number(data: bytes) -> int:
    result = 0
    for index, byte in enumerate(data):
        high, low = byte >> 4, byte & 15
        if high > 9 or low > 9:
            raise ValueError("invalid BCD")
        result += (high * 10 + low) * (100 ** index)
    return result


def numeric_field(data: bytes, signed: bool = False) -> str:
    text = data.decode("ascii").strip()
    pattern = r"-?\d+(?:\.\d+)?" if signed else r"\d+(?:\.\d+)?"
    if not re.fullmatch(pattern, text):
        raise ValueError("invalid numeric field")
    return text


def parse_frame(protocol: str, frame: bytes) -> dict[str, Any] | None:
    """Parse a candidate frame, returning None if its documented shape fails.

    A matching shape is not proof of the machine model or a completed sale.
    F/G decimal scales are intentionally left uninterpreted.
    """
    try:
        if protocol == "a":
            if len(frame) != 14 or frame[0] != 0xFF:
                return None
            weight_places, price_places, amount_places = (frame[i] & 7 for i in (1, 5, 9))
            if any(p not in (1, 2, 3, 4) for p in (weight_places, price_places, amount_places)) or frame[13] == 255:
                return None
            weight, price, amount = (bcd_number(frame[a:b]) for a, b in ((2, 5), (6, 9), (10, 13)))
            return {
                "weight": ("-" if frame[1] & 0x08 and weight else "") + decimal_string(weight, weight_places - 1),
                "unit": "not kg" if frame[1] & 0x80 else "kg",
                "stable": bool(frame[1] & 0x10), "weight_overflow": bool(frame[1] & 0x20),
                "accumulation_or_total_mode": bool(frame[1] & 0x40),
                "unit_price": decimal_string(price, price_places - 1),
                "price_is_accumulated_count": bool(frame[5] & 0x08),
                "amount": decimal_string(amount, amount_places - 1),
                "amount_is_accumulated": bool(frame[9] & 0x08),
                "amount_overflow": bool(frame[9] & 0x10),
                "amount_invalid_due_to_negative_weight": bool(frame[9] & 0x20),
                "configured_address_not_global_id": frame[13],
            }
        if protocol == "b":
            if len(frame) != 6 or frame[0] != 0xFF or frame[5] not in (0, 1):
                return None
            places = frame[1] & 7
            if places not in (1, 2, 3, 4) or frame[1] & 0x18:
                return None
            value = bcd_number(frame[2:5])
            return {"weight": ("-" if frame[1] & 0x20 and value else "") + decimal_string(value, places - 1),
                    "unit": "kg" if frame[5] == 0 else "not kg", "stable": bool(frame[1] & 0x40),
                    "overflow": bool(frame[1] & 0x80)}
        if protocol == "c":
            if len(frame) != 18 or frame[:2] != b"WT" or frame[2:4] not in (b"ST", b"US", b"OL") or frame[4:5] not in (b"+", b"-") or frame[-2:] != b"\r\n":
                return None
            weight = numeric_field(frame[5:12])
            unit = frame[12:16].decode("ascii").strip()
            if not unit or not re.fullmatch(r"[A-Za-z]+", unit):
                return None
            return {"weight": ("-" if frame[4:5] == b"-" else "") + weight, "unit": unit,
                    "status": {b"ST": "stable", b"US": "unstable", b"OL": "overload"}[frame[2:4]]}
        if protocol == "d":
            if len(frame) != 8 or frame[:1] != b"=" or frame[7:8] not in (b" ", b"-"):
                return None
            reversed_weight = frame[1:7].decode("ascii").strip()[::-1]
            if not re.fullmatch(r"\d+(?:\.\d+)?", reversed_weight):
                return None
            return {"weight": ("-" if frame[7:8] == b"-" else "") + reversed_weight,
                    "unit": "not specified in frame"}
        if protocol == "e":
            if len(frame) != 12 or frame[0] != 2 or frame[-1] != 3 or frame[1:2] not in (b"+", b"-"):
                return None
            digits, places, checksum = frame[2:8], frame[8:9], frame[9:11]
            if not re.fullmatch(rb"\d{6}", digits) or not re.fullmatch(rb"[0-4]", places) or not re.fullmatch(rb"[0-9A-Fa-f]{2}", checksum):
                return None
            check = 0
            for byte in frame[1:9]:
                check ^= byte
            if check != int(checksum, 16):
                return None
            value = int(digits)
            return {"weight": ("-" if frame[1:2] == b"-" and value else "") + decimal_string(value, int(places)),
                    "checksum": "valid", "unit": "not specified in frame"}
        if protocol == "f":
            if len(frame) != 22 or frame[:2] != b"\n\r" or frame[7:9] != b"  " or frame[14:16] != b"  ":
                return None
            # Blank fields are documented for negative weight; do not interpret them as zero.
            fields = [frame[2:7], frame[9:14], frame[16:22]]
            if not all(re.fullmatch(rb" *\d+| +", field) for field in fields):
                return None
            return {"weight_digits_raw": fields[0].decode().strip(), "unit_price_digits_raw": fields[1].decode().strip(),
                    "amount_digits_raw": fields[2].decode().strip(), "decimal_positions": "not supplied in frame; verify on machine"}
        if protocol == "g":
            if len(frame) != 7 or frame[:2] != b"\n\r":
                return None
            field = frame[2:7].decode("ascii")
            if not re.fullmatch(r" *-?\d+", field):
                return None
            return {"weight_digits_raw": field.strip(), "decimal_positions": "not supplied in frame; verify on machine"}
        if protocol == "h":
            if frame == b"?????":
                return {"status": "unstable or negative per document"}
            if len(frame) != 11 or frame[0] != 2 or frame[8:9] != b" " or not re.fullmatch(rb"[A-Za-z]{2}", frame[9:11]):
                return None
            return {"weight": numeric_field(frame[1:8]), "unit": frame[9:11].decode("ascii"),
                    "status": "stable and positive per document"}
    except (UnicodeDecodeError, ValueError, decimal.InvalidOperation):
        return None
    return None


def find_candidates(data: bytes, selected: str = "auto") -> dict[str, Any]:
    sizes = {"a": (14,), "b": (6,), "c": (18,), "d": (8,), "e": (12,), "f": (22,), "g": (7,), "h": (11, 5)}
    results: dict[str, Any] = {}
    for protocol, lengths in sizes.items():
        if selected != "auto" and selected != protocol:
            continue
        count, samples = 0, []
        for length in lengths:
            for offset in range(max(0, len(data) - length + 1)):
                frame = data[offset:offset + length]
                parsed = parse_frame(protocol, frame)
                if parsed is not None:
                    count += 1
                    if len(samples) < SAMPLE_LIMIT:
                        samples.append({"offset": offset, "frame_hex": frame.hex(" "), "fields": parsed})
        if count:
            results[protocol.upper()] = {"candidate_frames": count, "samples": samples}
    return results


def positive_number(value: str) -> float:
    try:
        number = float(value)
        if not 0 < number <= 120:
            raise ValueError
        return number
    except ValueError as error:
        raise argparse.ArgumentTypeError("must be greater than 0 and at most 120 seconds") from error


def tcp_port(value: str) -> int:
    try:
        number = int(value)
        if not 1 <= number <= 65535:
            raise ValueError
        return number
    except ValueError as error:
        raise argparse.ArgumentTypeError("port must be between 1 and 65535") from error


def sequence_number(value: str) -> int:
    try:
        number = int(value)
        if not 0 <= number <= 9999:
            raise ValueError
        return number
    except ValueError as error:
        raise argparse.ArgumentTypeError("sequence must be between 0 and 9999") from error


def ports() -> dict[str, Any]:
    try:
        from serial.tools import list_ports
    except ImportError as error:
        raise RuntimeError("Serial support requires pyserial. Install it with: python -m pip install pyserial") from error
    return {"ports": [{"port": p.device, "description": p.description, "hardware_id": p.hwid} for p in list_ports.comports()],
            "note": "A listed port is not proof that a scale is attached or compatible."}


def serial_capture(args: argparse.Namespace) -> dict[str, Any]:
    try:
        import serial
    except ImportError as error:
        raise RuntimeError("Serial support requires pyserial. Install it with: python -m pip install pyserial") from error
    data = bytearray()
    with serial.Serial(port=args.port, baudrate=args.baud, bytesize=serial.EIGHTBITS,
                       parity=serial.PARITY_NONE, stopbits=serial.STOPBITS_ONE,
                       timeout=min(0.2, args.duration), write_timeout=2,
                       xonxoff=False, rtscts=False, dsrdtr=False) as connection:
        if args.send_h_request:
            connection.write(b"P")
            connection.flush()
        deadline = time.monotonic() + args.duration
        while time.monotonic() < deadline and len(data) < MAX_CAPTURE:
            chunk = connection.read(min(256, MAX_CAPTURE - len(data)))
            if chunk:
                data.extend(chunk)
    candidates = find_candidates(bytes(data), args.protocol)
    return {"mode": "serial", "port": args.port, "baud": args.baud, "serial_format": "8N1",
            "requested_protocol": args.protocol.upper(), "p_request_sent": args.send_h_request,
            "bytes_received": len(data), "capture_limit_reached": len(data) == MAX_CAPTURE,
            "raw_hex_first_512_bytes": bytes(data[:DISPLAY_BYTES]).hex(" "),
            "candidate_formats": candidates,
            "result": "possible_format_match" if candidates else ("unrecognized_bytes" if data else "no_bytes_received"),
            "interpretation": "Candidates are not proof of model, completed sales, or PLU write support. F and G can overlap."
            }


def network_probe(args: argparse.Namespace) -> dict[str, Any]:
    result: dict[str, Any] = {"mode": "network", "host": args.host, "port": args.port,
                              "statement_request_sent": False, "result": "tcp_connected"}
    with socket.create_connection((args.host, args.port), timeout=args.timeout) as connection:
        connection.settimeout(args.timeout)
        if args.request_statement is None:
            result["interpretation"] = "TCP connected only; this does not establish the device type or protocol."
            return result
        command = f"!0J{args.request_statement:04d}A".encode("ascii") + b"\r\n\x03"
        connection.sendall(command)
        result.update(statement_request_sent=True, request_hex=command.hex(" "), requested_sequence=args.request_statement)
        data = bytearray()
        deadline = time.monotonic() + args.timeout
        timed_out = False
        while len(data) < MAX_CAPTURE and b"\x03" not in data:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                timed_out = True
                break
            connection.settimeout(remaining)
            try:
                chunk = connection.recv(min(4096, MAX_CAPTURE - len(data)))
            except socket.timeout:
                timed_out = True
                break
            if not chunk:
                break
            data.extend(chunk)
        result.update(response_bytes=len(data), response_hex_first_512_bytes=bytes(data[:DISPLAY_BYTES]).hex(" "),
                      response_complete=b"\x03" in data, timed_out=timed_out, capture_limit_reached=len(data) == MAX_CAPTURE)
        if b"\x03" not in data:
            result["result"] = "incomplete_or_no_reply"
        else:
            reply = bytes(data).split(b"\x03", 1)[0].rstrip(b"\r\n")
            prefix = f"0j{args.request_statement:04d}a".encode("ascii")
            if reply.lower() == prefix + b"c":
                result["result"] = "documented_no_data_shape"
            elif reply.lower().startswith(prefix) and len(reply) >= 50:
                result["result"] = "possible_statement_shape"
            else:
                result["result"] = "unrecognized_reply"
        result["interpretation"] = "A matching response is evidence, not proof of full compatibility or record behavior. Preserve raw bytes securely."
        return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="mode", required=True)
    sub.add_parser("ports", help="List serial ports without opening them (requires pyserial)")
    serial_parser = sub.add_parser("serial", help="Capture bytes from one selected serial port (requires pyserial)")
    serial_parser.add_argument("--port", required=True, help="Port name, for example COM3")
    serial_parser.add_argument("--baud", type=int, choices=(1200, 2400, 4800, 9600), required=True)
    serial_parser.add_argument("--duration", type=positive_number, default=10.0, help="Capture seconds, maximum 120")
    serial_parser.add_argument("--protocol", choices=("auto", "a", "b", "c", "d", "e", "f", "g", "h"), default="auto")
    serial_parser.add_argument("--send-h-request", action="store_true", help="Actively transmit ASCII P once; use ONLY after confirming protocol H")
    network = sub.add_parser("network", help="Connect to one explicitly specified network host")
    network.add_argument("--host", required=True, help="The scale's private IP address or hostname")
    network.add_argument("--port", type=tcp_port, default=4001)
    network.add_argument("--timeout", type=positive_number, default=5.0)
    network.add_argument("--request-statement", type=sequence_number, metavar="SEQUENCE", help="Actively send one documented TM-A J request")
    network.add_argument("--acknowledge-unknown-effects", action="store_true", help="Acknowledge record retrieval effects are not verified on this hardware")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.mode == "serial" and args.send_h_request and args.protocol != "h":
        parser.error("--send-h-request requires --protocol h; confirm the machine supports H first")
    if args.mode == "network" and args.request_statement is not None and not args.acknowledge_unknown_effects:
        parser.error("--request-statement requires --acknowledge-unknown-effects")
    try:
        result = ports() if args.mode == "ports" else serial_capture(args) if args.mode == "serial" else network_probe(args)
        print(json.dumps(result, indent=2, ensure_ascii=True))
        return 0
    except (OSError, RuntimeError, ValueError) as error:
        print(json.dumps({"result": "error", "message": str(error)}, indent=2), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
