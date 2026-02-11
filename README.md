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
- `--no-scrape` to skip scraping and only work with existing database data.
- `GOV_TRAVEL_USER_AGENT="YourOrg/1.0"` to override the default user agent.

## Export an estimate to Excel
After data exists in SQLite (from a previous scrape), export a cost estimate workbook:

```bash
python -m gov_travel.main \
  --db data/travel_rates.sqlite3 \
  --no-scrape \
  --export-estimate-xlsx output/travel_estimate.xlsx \
  --estimate-days 5 \
  --estimate-rate-type meal \
  --estimate-country Canada \
  --estimate-city Ottawa \
  --estimate-lodging-per-night 235 \
  --estimate-transport-total 175 \
  --estimate-misc-total 80
```

Workbook sheets:
- `estimate_summary`: Days, recommended meal allowance, line item subtotals, and grand total.
- `matched_rate_entries`: Source rows used to derive the allowance recommendation.

## Database contents
The database includes:
- `raw_tables` for every scraped HTML table.
- `rate_entries` for parsed rate rows (country/city/province + rate fields).
- `exchange_rates` for parsed currency rates.
- `accommodations` for parsed lodging listings.

If a field is not detected by the heuristics, the full row is still preserved in `raw_tables` and the `raw_json` columns for deeper post-processing.

## Suggested next improvements
- Add automated tests for parser heuristics and the estimate export path.
- Add currency conversion in estimate exports using `exchange_rates` so totals can be normalized to CAD.
- Add source-level freshness metadata to avoid duplicate inserts when scraping repeatedly.
- Expose estimate/export in a small web UI for non-technical users.
