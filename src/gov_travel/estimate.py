from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd


@dataclass(frozen=True)
class EstimateConfig:
    days: int
    lodging_per_night: float
    transport_total: float
    misc_total: float
    rate_type: str
    country: str | None = None
    city: str | None = None
    province: str | None = None


def _load_rate_matches(connection: sqlite3.Connection, config: EstimateConfig) -> list[dict[str, Any]]:
    query = """
        SELECT
            source,
            source_url,
            table_title,
            country,
            city,
            province,
            currency,
            rate_type,
            rate_amount,
            effective_date
        FROM rate_entries
        WHERE rate_amount IS NOT NULL
          AND LOWER(rate_type) LIKE LOWER(?)
    """
    params: list[Any] = [f"%{config.rate_type}%"]
    if config.country:
        query += " AND LOWER(country) = LOWER(?)"
        params.append(config.country)
    if config.city:
        query += " AND LOWER(city) = LOWER(?)"
        params.append(config.city)
    if config.province:
        query += " AND LOWER(province) = LOWER(?)"
        params.append(config.province)

    query += " ORDER BY effective_date DESC, rate_amount DESC"
    rows = connection.execute(query, params).fetchall()
    return [dict(row) for row in rows]


def _pick_recommended_rate(matches: list[dict[str, Any]]) -> tuple[float, str]:
    if not matches:
        return 0.0, "CAD"

    currency = matches[0].get("currency") or "CAD"
    latest_date = matches[0].get("effective_date")
    latest_rows = [
        row for row in matches if row.get("effective_date") == latest_date and row.get("currency") == currency
    ]
    candidates = latest_rows or matches[:5]
    average_rate = sum(float(row["rate_amount"]) for row in candidates if row.get("rate_amount") is not None) / max(
        len(candidates),
        1,
    )
    return round(average_rate, 2), currency


def export_estimate_xlsx(
    connection: sqlite3.Connection,
    output_path: Path,
    config: EstimateConfig,
) -> Path:
    matches = _load_rate_matches(connection, config)
    recommended_rate, currency = _pick_recommended_rate(matches)

    meals_total = round(recommended_rate * config.days, 2)
    lodging_total = round(config.lodging_per_night * config.days, 2)
    grand_total = round(meals_total + lodging_total + config.transport_total + config.misc_total, 2)

    summary_rows = [
        {"item": "Days", "value": config.days, "currency": ""},
        {"item": f"Meal allowance ({config.rate_type})", "value": recommended_rate, "currency": currency},
        {"item": "Meals subtotal", "value": meals_total, "currency": currency},
        {"item": "Lodging per night", "value": config.lodging_per_night, "currency": currency},
        {"item": "Lodging subtotal", "value": lodging_total, "currency": currency},
        {"item": "Transport total", "value": config.transport_total, "currency": currency},
        {"item": "Misc total", "value": config.misc_total, "currency": currency},
        {"item": "Grand total", "value": grand_total, "currency": currency},
    ]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame(summary_rows).to_excel(writer, index=False, sheet_name="estimate_summary")
        pd.DataFrame(matches).to_excel(writer, index=False, sheet_name="matched_rate_entries")

    return output_path
