# Gov_Travel_App

## Overview
This repository contains a Python scraper that collects travel rate tables from the NJC and accommodation listings, then stores the raw tables and normalized entries in a SQLite database.

## Setup
```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Run the scraper
```bash
python -m gov_travel.main --db data/travel_rates.sqlite3
```

### Optional flags
- `--sources international domestic accommodations` to limit which sources are scraped.
- `--pause 1.5` to pause between processing tables.
- `--log-level DEBUG` to increase logging verbosity.
- `GOV_TRAVEL_USER_AGENT="YourOrg/1.0"` to override the default user agent.

The database includes:
- `raw_tables` for every scraped HTML table.
- `rate_entries` for parsed rate rows (country/city/province + rate fields).
- `exchange_rates` for parsed currency rates.
- `accommodations` for parsed lodging listings.

If a field is not detected by the heuristics, the full row is still preserved in `raw_tables` and the `raw_json` columns for deeper post-processing.
