from __future__ import annotations

import json
import logging
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Iterable

import pandas as pd
import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

LOGGER = logging.getLogger(__name__)
USER_AGENT = os.getenv("GOV_TRAVEL_USER_AGENT", "GovTravelScraper/1.0 (+https://example.com)")
DEFAULT_TIMEOUT = 60


@dataclass(frozen=True)
class SourceConfig:
    name: str
    url: str


SOURCES = [
    SourceConfig(name="international", url="https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en"),
    SourceConfig(name="domestic", url="https://www.njc-cnm.gc.ca/directive/d10/v325/s978/en"),
    SourceConfig(name="accommodations", url="https://rehelv-acrd.tpsgc-pwgsc.gc.ca/lth-crl-eng.aspx"),
]


def build_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


def fetch_html(url: str, session: requests.Session | None = None) -> str:
    active_session = session or build_session()
    response = active_session.get(url, headers={"User-Agent": USER_AGENT}, timeout=DEFAULT_TIMEOUT)
    response.raise_for_status()
    response.encoding = response.apparent_encoding
    return response.text


def extract_tables(html: str) -> list[pd.DataFrame]:
    try:
        return pd.read_html(html)
    except ValueError:
        return []


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


def scrape_tables_from_source(
    source: SourceConfig,
    session: requests.Session | None = None,
    pause_seconds: float = 0.0,
) -> list[dict[str, Any]]:
    LOGGER.debug("Fetching HTML for %s", source.url)
    html = fetch_html(source.url, session=session)
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
        if pause_seconds:
            time.sleep(pause_seconds)
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
                        "table_index": table["table_index"],
                        "table_title": table.get("title"),
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
                    "table_index": table["table_index"],
                    "table_title": table.get("title"),
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
                    "table_index": table["table_index"],
                    "table_title": table.get("title"),
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
