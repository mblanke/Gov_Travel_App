# Update — Ground Transportation Sub-Section

**Date:** February 18, 2026

## Summary

Added a **Ground Transportation** sub-section under the Transportation section of the travel cost estimator. This covers taxi or car rental costs for:

- **Home ↔ Departure Airport** (origin leg)
- **Destination Airport ↔ Hotel** (destination leg)
- Optional **round-trip** toggle (checked by default, doubles the one-way costs)

## Behavior

| Transport Mode | Ground Transport Shown? | Reason |
|---------------|------------------------|--------|
| Flight | ✅ Yes | Need taxi/rental to get to airport |
| Train | ✅ Yes | Need taxi/rental to get to station |
| Personal Vehicle | ❌ No | You're driving yourself |

### Form Fields

- **Ground Transport Type** dropdown: None / Taxi-Rideshare / Car Rental
- **Home ↔ Departure Airport (CAD)**: One-way cost input
- **Destination Airport ↔ Hotel (CAD)**: One-way cost input
- **Include return trips (round-trip)**: Checkbox (default: checked)

### Results Breakdown

When ground transport costs are entered, a new breakdown item appears between "Transportation Cost" and "Accommodation":

> **Ground Transport (Taxi/Rideshare)** — CAD 160.00
> Taxi/Rideshare (round-trip): Home ↔ Airport: $90.00 + Airport ↔ Hotel: $70.00

The ground transport cost is included in the **Total Estimated Cost** and in **MDXTP Excel/CSV exports**.

## Files Changed

### `public/index.html`
- Added `<fieldset id="groundTransportGroup">` with ground transport type dropdown, origin/destination cost inputs, and round-trip checkbox
- Added `<div id="groundTransportBreakdown">` in the results breakdown section
- Updated cache busters to `v=20260219-1400`
- Added cache buster to `styles.css` link

### `public/script.js`
- Added DOM element references: `groundTransportCostEl`, `groundTransportNoteEl`, `groundTransportLabelEl`, `groundTransportBreakdown`
- Updated `handleTransportModeChange()`: shows ground transport group for Flight/Train, hides and resets for Vehicle
- Added `handleGroundTransportTypeChange()`: toggles cost input fields based on type selection
- Added event listener for `groundTransportType` change
- Updated `calculateEstimate()`: reads ground transport form values, computes cost with round-trip multiplier, builds descriptive note
- Updated `calculateCosts()`: accepts `groundTransportCost`, `groundTransportNote`, `groundTransportType` params; includes `groundTransportCAD` in total
- Updated `displayResults()`: shows/hides ground transport breakdown item with formatted cost and note

### `public/styles.css`
- Added `.ground-transport-fieldset` styles: border, border-radius, padding, background
- Added `.ground-transport-fieldset legend` styles: bold, navy color
- Added `.ground-transport-fieldset .fieldset-help` styles: muted text

### `public/mdxtp-export.js`
- Updated `gatherMDXTPData()`:
  - Appends ground transport note to `notesLines`
  - Appends ground transport cost to `transportRationale`
  - Adds `groundTransportCAD` to `transportCost` total
  - Includes `groundTransportCost`, `groundTransportType`, `groundTransportNote` in return metadata

## Test Results

- ✅ Flight mode: ground transport fieldset appears
- ✅ Train mode: ground transport fieldset appears
- ✅ Vehicle mode: ground transport fieldset hidden, values reset
- ✅ Taxi selected: cost input fields appear
- ✅ Car Rental selected: cost input fields appear
- ✅ None selected: cost input fields hidden
- ✅ Round-trip calculation correct ($45 × 2 = $90, $35 × 2 = $70, total = $160)
- ✅ Ground transport included in total cost
- ✅ Ground transport breakdown item displays in results
- ✅ MDXTP export includes ground transport data
- ✅ 0 lint/compile errors across all changed files
- ✅ Container running on port 5001
