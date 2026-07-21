# Changelog

All notable changes to the Government Travel Cost Estimator. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Dates are the dates recorded in the
original update notes; entries without a version label are grouped under Unreleased.

## [Unreleased]

### Changed
- **All rates refreshed to current NJC publications** (2026-07-20): Appendix C meals/incidentals effective 2026-04-01 (Canada meal total $121.25, incidentals $25.00/$18.75), Appendix B kilometric rates effective 2026-07-01, ACRD 2026 city accommodation limits, and full Appendix D international per-diems.
- **Kilometric model is now per-province** (NJC publishes one rate per province/territory of vehicle registration — the previous flat $0.68/km tier model doesn't exist in Appendix B). New "Province of Vehicle Registration" selector in vehicle mode.
- **The JSON files in `data/` are the single canonical rate source.** `scripts/migrate.js` (replaces five older migration variants) deterministically rebuilds `database/travel_rates.db` from them with built-in rate self-assertions and an atomic swap. This also fixes the corrupt `accommodation_limits` table (4 junk rows → 1,360 real cities).
- **Frontend city/accommodation lookups now use the server API** (`/api/accommodation/search`, `/api/autocomplete`) instead of downloading a ~350 KB JSON to the browser; the bundled JSON remains as an automatic fallback if the API is down. Meal allowances now come from the database per destination, including city-specific Appendix D rates. All city inputs are debounced.
- **Scraper pipeline rebuilt** (`src/gov_travel/`): Appendix D letter pages discovered at runtime (fixes the 9-country fragment), ACRD month columns parsed correctly (fixes all-NULL rates), effective dates captured, and a new `gov_travel.transform` module regenerates the curated JSON with a `--dry-run` diff.
- Appendix D data now records per-tier **incidentals** (previous data mislabeled these as accommodation); international accommodation ceilings come from the ACRD foreign section.

### Performance
- Prepared statements cached in `databaseService` (were recompiled on every call); DB opened read-only; autocomplete/search use an indexed lowercase name column.
- Read-only DB endpoints cached (5 min); health check uses a cached `SELECT 1`; airport lookup tables hoisted to module scope; static assets served with ETag revalidation.

### Fixed
- `server.js` no longer starts a listener when imported by tests; flight-search tests use dynamic future dates.
- Removed dead `GET /` route, duplicate `/data` mount, unreachable `no-store` middleware, unused `axios` dependency; `engines` now requires Node >= 20 (AGENTS.md updated to match the node:20-slim Dockerfile).
- **Business-class eligibility is now evaluated per individual flight leg** (≥ 9 hours), not on total itinerary duration, per NJC Directive sections 3.3.11 / 3.4.11. A multi-stop trip whose total exceeds 9 hours but whose longest single leg does not is now correctly treated as economy. Flight cards and the selected-flight summary show the longest leg duration. (2026-02-19)
- **Sample flight durations are estimated from great-circle distance** instead of hardcoded values, so sample routes show realistic times (e.g. Ottawa→Toronto ~1.3h, Ottawa→Tokyo ~30h with stops). New helpers in `flightService.js`: `estimateFlightMinutes`, `estimateLongestLeg`, `haversineKm`, `getAirportCoords`, `minutesToISO`. (2026-02-19)

### Added
- **Ground Transportation sub-section** under Transportation: taxi/rideshare or car rental for the home↔departure-airport and destination-airport↔hotel legs, with a round-trip toggle (default on). Shown for flight and train modes, hidden for personal vehicle. Included in the total estimate and in MDXTP Excel/CSV exports. (2026-02-18)

## [1.2.0] - 2026-01-12

### Added
- Amadeus flight API integration: automatic flight search with real-time CAD pricing, auto-calculated duration, business-class flagging, and ~60+ known airport codes. Falls back to a Google Flights link / sample data when no API credentials are configured.
- Auto-save of form data (recovers unsaved work), trip history (up to 20 recent estimates), CSV export, and print-optimized output.
- Dark mode and keyboard shortcuts (`Ctrl+S/E/R/H/D`, `Esc`).
- Caching layer (`node-cache`): flights 1h, rate data 24h, database queries 5m; plus gzip response compression.
- Winston logging with daily-rotating files (combined / error / exceptions / rejections) and configurable `LOG_LEVEL`.
- Enhanced `/api/health` (uptime, database state, cache stats, version); dev-only `/api/cache/clear` and `/api/cache/stats`.
- Jest test scaffolding (`npm test`, `test:watch`, `test:coverage`).
- Accessibility: keyboard navigation, screen-reader support, high-contrast and reduced-motion handling.

### Security
- Helmet security headers, CORS configuration, Joi input validation.
- Rate limiting: 100 requests / 15 min per IP on `/api/`; 20 / 5 min on flight search.

## [1.1.0] - 2025-10-30

### Added
- Three transport modes: flight (with the 9-hour business-class rule), personal vehicle (kilometric rate $0.68/km tier 1, $0.58/km tier 2), and train.
- Google Flights link integration (dynamic, manual-entry assist) for flight cost estimates.
- Rate validation system with on-load checks and a standalone validation dashboard (`public/validation.html`): per-database status, summary stats, and audit-ready report export.
- `data/transportationRates.json` (kilometric rates, train policy, common route estimates).

## [1.0.0]

### Added
- Initial travel cost estimator: flight, accommodation, meals, and incidentals.
- JSON rate databases (per diem and accommodation) with effective-date tracking.
