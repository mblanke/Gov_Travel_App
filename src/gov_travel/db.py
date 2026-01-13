from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Iterable


SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS raw_tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        source_url TEXT NOT NULL,
        table_index INTEGER NOT NULL,
        title TEXT,
        data_json TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS rate_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        source_url TEXT NOT NULL,
        table_index INTEGER,
        table_title TEXT,
        country TEXT,
        city TEXT,
        province TEXT,
        currency TEXT,
        rate_type TEXT,
        rate_amount REAL,
        unit TEXT,
        effective_date TEXT,
        raw_json TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS exchange_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        source_url TEXT NOT NULL,
        table_index INTEGER,
        table_title TEXT,
        currency TEXT,
        rate_to_cad REAL,
        effective_date TEXT,
        raw_json TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS accommodations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        source_url TEXT NOT NULL,
        table_index INTEGER,
        table_title TEXT,
        property_name TEXT,
        address TEXT,
        city TEXT,
        province TEXT,
        phone TEXT,
        rate_amount REAL,
        currency TEXT,
        effective_date TEXT,
        raw_json TEXT NOT NULL
    )
    """,
]


def connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    return connection


def init_db(connection: sqlite3.Connection) -> None:
    for statement in SCHEMA_STATEMENTS:
        connection.execute(statement)
    connection.commit()


def insert_raw_tables(
    connection: sqlite3.Connection,
    source: str,
    source_url: str,
    tables: Iterable[dict],
) -> None:
    payload = [
        (
            source,
            source_url,
            table["table_index"],
            table.get("title"),
            json.dumps(table["data"], ensure_ascii=False),
        )
        for table in tables
    ]
    connection.executemany(
        """
        INSERT INTO raw_tables (source, source_url, table_index, title, data_json)
        VALUES (?, ?, ?, ?, ?)
        """,
        payload,
    )
    connection.commit()


def insert_rate_entries(
    connection: sqlite3.Connection,
    entries: Iterable[dict],
) -> None:
    payload = [
        (
            entry["source"],
            entry["source_url"],
            entry.get("table_index"),
            entry.get("table_title"),
            entry.get("country"),
            entry.get("city"),
            entry.get("province"),
            entry.get("currency"),
            entry.get("rate_type"),
            entry.get("rate_amount"),
            entry.get("unit"),
            entry.get("effective_date"),
            json.dumps(entry["raw"], ensure_ascii=False),
        )
        for entry in entries
    ]
    if not payload:
        return
    connection.executemany(
        """
        INSERT INTO rate_entries (
            source,
            source_url,
            table_index,
            table_title,
            country,
            city,
            province,
            currency,
            rate_type,
            rate_amount,
            unit,
            effective_date,
            raw_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        payload,
    )
    connection.commit()


def insert_exchange_rates(
    connection: sqlite3.Connection,
    entries: Iterable[dict],
) -> None:
    payload = [
        (
            entry["source"],
            entry["source_url"],
            entry.get("table_index"),
            entry.get("table_title"),
            entry.get("currency"),
            entry.get("rate_to_cad"),
            entry.get("effective_date"),
            json.dumps(entry["raw"], ensure_ascii=False),
        )
        for entry in entries
    ]
    if not payload:
        return
    connection.executemany(
        """
        INSERT INTO exchange_rates (
            source,
            source_url,
            table_index,
            table_title,
            currency,
            rate_to_cad,
            effective_date,
            raw_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        payload,
    )
    connection.commit()


def insert_accommodations(
    connection: sqlite3.Connection,
    entries: Iterable[dict],
) -> None:
    payload = [
        (
            entry["source"],
            entry["source_url"],
            entry.get("table_index"),
            entry.get("table_title"),
            entry.get("property_name"),
            entry.get("address"),
            entry.get("city"),
            entry.get("province"),
            entry.get("phone"),
            entry.get("rate_amount"),
            entry.get("currency"),
            entry.get("effective_date"),
            json.dumps(entry["raw"], ensure_ascii=False),
        )
        for entry in entries
    ]
    if not payload:
        return
    connection.executemany(
        """
        INSERT INTO accommodations (
            source,
            source_url,
            table_index,
            table_title,
            property_name,
            address,
            city,
            province,
            phone,
            rate_amount,
            currency,
            effective_date,
            raw_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        payload,
    )
    connection.commit()
