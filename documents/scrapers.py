from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Iterable

import pandas as pd
import requests
from bs4 import BeautifulSoup

USER_AGENT = "GovTravelScraper/1.0 (+https://example.com)"


@dataclass(frozen=True)
class SourceConfig:
    name: str
    url: str


SOURCES = [
    SourceConfig(name="international", url="https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en"),
    SourceConfig(name="domestic", url="https://www.njc-cnm.gc.ca/directive/d10/v325/s978/en"),
    SourceConfig(name="accommodations", url="https://rehelv-acrd.tpsgc-pwgsc.gc.ca/lth-crl-eng.aspx"),
]


def fetch_html(url: str) -> str:
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=60)
    response.raise_for_status()
    response.encoding = response.apparent_encoding
    return response.text


def extract_tables(html: str) -> list[pd.DataFrame]:
    return pd.read_html(html)


def _normalize_header(header: str) -> str:
    return re.sub(r"\s+", " ", header.strip().lower())


def _parse_amount(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value)
    match = re.search(r"-?\d+(?:[\.,]\d+)?", text)
    if not match:
        return None
    amount_text = match.group(0).replace(",", "")
    try:
        return float(amount_text)
    except ValueError:
        return None


def _detect_currency(value: Any, fallback: str | None = None) -> str | None:
    if value is None:
        return fallback
    text = str(value).upper()
    if "CAD" in text:
        return "CAD"
    if "USD" in text:
        return "USD"
    match = re.search(r"\b[A-Z]{3}\b", text)
    if match:
        return match.group(0)
    return fallback


def _table_title_map(html: str) -> dict[int, str]:
    soup = BeautifulSoup(html, "html.parser")
    titles: dict[int, str] = {}
    for index, table in enumerate(soup.find_all("table")):
        heading = table.find_previous(["h1", "h2", "h3", "h4", "caption"])
        if heading:
            titles[index] = heading.get_text(strip=True)
    return titles


def scrape_tables_from_source(source: SourceConfig) -> list[dict[str, Any]]:
    html = fetch_html(source.url)
    tables = extract_tables(html)
    title_map = _table_title_map(html)
    results = []
    for index, table in enumerate(tables):
        data = json.loads(table.to_json(orient="records"))
        results.append(
            {
                "table_index": index,
                "title": title_map.get(index),
                "data": data,
            }
        )
    return results


def extract_rate_entries(
    source: SourceConfig,
    tables: Iterable[dict[str, Any]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for table in tables:
        for row in table["data"]:
            normalized = {_normalize_header(k): v for k, v in row.items()}
            country = normalized.get("country") or normalized.get("country/territory")
            city = normalized.get("city") or normalized.get("location")
            province = normalized.get("province") or normalized.get("province/territory")
            currency = _detect_currency(normalized.get("currency"))
            effective_date = normalized.get("effective date") or normalized.get("effective")
            for key, value in normalized.items():
                if key in {"country", "country/territory", "city", "location", "province", "province/territory", "currency", "effective", "effective date"}:
                    continue
                amount = _parse_amount(value)
                if amount is None:
                    continue
                entry_currency = _detect_currency(value, fallback=currency)
                entries.append(
                    {
                        "source": source.name,
                        "source_url": source.url,
                        "country": country,
                        "city": city,
                        "province": province,
                        "currency": entry_currency,
                        "rate_type": key,
                        "rate_amount": amount,
                        "unit": None,
                        "effective_date": effective_date,
                        "raw": row,
                    }
                )
    return entries


def extract_exchange_rates(
    source: SourceConfig,
    tables: Iterable[dict[str, Any]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for table in tables:
        for row in table["data"]:
            normalized = {_normalize_header(k): v for k, v in row.items()}
            currency = (
                normalized.get("currency")
                or normalized.get("currency code")
                or normalized.get("code")
            )
            rate = (
                normalized.get("exchange rate")
                or normalized.get("rate")
                or normalized.get("cad rate")
                or normalized.get("rate to cad")
            )
            rate_amount = _parse_amount(rate)
            if not currency or rate_amount is None:
                continue
            entries.append(
                {
                    "source": source.name,
                    "source_url": source.url,
                    "currency": _detect_currency(currency),
                    "rate_to_cad": rate_amount,
                    "effective_date": normalized.get("effective date") or normalized.get("date"),
                    "raw": row,
                }
            )
    return entries


def extract_accommodations(
    source: SourceConfig,
    tables: Iterable[dict[str, Any]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for table in tables:
        for row in table["data"]:
            normalized = {_normalize_header(k): v for k, v in row.items()}
            property_name = (
                normalized.get("property")
                or normalized.get("hotel")
                or normalized.get("accommodation")
                or normalized.get("name")
            )
            if not property_name and not normalized.get("city"):
                continue
            rate_amount = _parse_amount(
                normalized.get("rate")
                or normalized.get("room rate")
                or normalized.get("daily rate")
            )
            currency = _detect_currency(normalized.get("rate"))
            entries.append(
                {
                    "source": source.name,
                    "source_url": source.url,
                    "property_name": property_name,
                    "address": normalized.get("address"),
                    "city": normalized.get("city") or normalized.get("location"),
                    "province": normalized.get("province") or normalized.get("province/territory"),
                    "phone": normalized.get("phone") or normalized.get("telephone"),
                    "rate_amount": rate_amount,
                    "currency": currency,
                    "effective_date": normalized.get("effective date") or normalized.get("effective"),
                    "raw": row,
                }
            )
    return entries