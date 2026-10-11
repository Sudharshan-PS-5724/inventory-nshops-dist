from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RawStatement:
    device_id: str
    record_epoch: int
    record_sequence: int
    payload: bytes


class Outbox:
    def __init__(self, path: str) -> None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(path)
        self.connection.execute(
            """create table if not exists raw_statements (
                device_id text not null, record_epoch integer not null, record_sequence integer not null,
                payload blob not null, received_at text not null default current_timestamp,
                acknowledged_at text, primary key (device_id, record_epoch, record_sequence)
            )"""
        )
        self.connection.commit()

    def store(self, statement: RawStatement) -> None:
        self.connection.execute(
            "insert or ignore into raw_statements(device_id, record_epoch, record_sequence, payload) values (?, ?, ?, ?)",
            (statement.device_id, statement.record_epoch, statement.record_sequence, statement.payload),
        )
        self.connection.commit()

    def close(self) -> None:
        self.connection.close()
