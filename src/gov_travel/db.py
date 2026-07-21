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
    CREATE TABLE IF NOT EXISTS appendix_d_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country TEXT NOT NULL,
        country_key TEXT NOT NULL,
        currency TEXT NOT NULL,
        city TEXT NOT NULL,
        city_key TEXT NOT NULL,
        tier TEXT NOT NULL,
        breakfast REAL,
        lunch REAL,
        dinner REAL,
        meal_total REAL,
        incidental REAL,
        grand_total REAL,
        effective_date TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS city_rate_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section TEXT NOT NULL,
        city TEXT NOT NULL,
        city_key TEXT NOT NULL,
        province_state TEXT,
        country TEXT,
        currency TEXT NOT NULL,
        monthly_rates_json TEXT NOT NULL,
        effective_date TEXT
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


def clear_source(connection: sqlite3.Connection, source: str) -> None:
    """Remove a source's rows so re-scrapes replace instead of append."""
    connection.execute("DELETE FROM raw_tables WHERE source = ?", (source,))
    connection.execute("DELETE FROM rate_entries WHERE source = ?", (source,))
    if source == "international":
        connection.execute("DELETE FROM appendix_d_rates")
    if source == "accommodations":
        connection.execute("DELETE FROM city_rate_limits")
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
            table.get("source_url", source_url),
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        payload,
    )
    connection.commit()


def insert_appendix_d_rates(
    connection: sqlite3.Connection,
    records: Iterable[dict],
) -> None:
    payload = [
        (
            record["country"],
            record["country_key"],
            record["currency"],
            record["city"],
            record["city_key"],
            record["tier"],
            record.get("breakfast"),
            record.get("lunch"),
            record.get("dinner"),
            record.get("meal_total"),
            record.get("incidental"),
            record.get("grand_total"),
            record.get("effective_date"),
        )
        for record in records
    ]
    if not payload:
        return
    connection.executemany(
        """
        INSERT INTO appendix_d_rates (
            country, country_key, currency, city, city_key, tier,
            breakfast, lunch, dinner, meal_total, incidental, grand_total,
            effective_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        payload,
    )
    connection.commit()


def insert_city_rate_limits(
    connection: sqlite3.Connection,
    records: Iterable[dict],
) -> None:
    payload = [
        (
            record["section"],
            record["city"],
            record["city_key"],
            record.get("province_state"),
            record.get("country"),
            record["currency"],
            json.dumps(record["monthly_rates"]),
            record.get("effective_date"),
        )
        for record in records
    ]
    if not payload:
        return
    connection.executemany(
        """
        INSERT INTO city_rate_limits (
            section, city, city_key, province_state, country, currency,
            monthly_rates_json, effective_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        payload,
    )
    connection.commit()
