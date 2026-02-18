/**
 * MDXTP (Monthly Divisional Expanded Travel Plan) Export
 * Generates Excel (.xlsx) and CSV exports matching the ADM(IM) MDXTP template format.
 *
 * MDXTP Columns:
 *   Serial # | Event? | Dates | Location | Objective (A) | Travel Cat (B) |
 *   Cat 5 Detail | # Pub Servants (C) | # Non-Pub | Rationale Virtual (D) |
 *   Name(s) (E) | Rationale # Travellers | Transport Rationale (F.1) |
 *   Accommodation Rationale (G.1) | Notes | Transport Cost (F.2) |
 *   Accommodation Cost (G.2) | Meals (H) | Incidentals (I) | Total | Risk (J)
 */

/* global XLSX, currentEstimateData, convertCurrency */
/* exported exportMDXTP, exportMDXTPCSV */

// ============================================================
// Helper: gather all travel data from the current estimate + form
// ============================================================
function gatherMDXTPData() {
  const data = currentEstimateData;
  if (!data) return null;

  const departureDate = document.getElementById("departureDate").value || "";
  const returnDate = document.getElementById("returnDate").value || "";
  const destinationType =
    document.getElementById("destinationType").selectedOptions[0]?.text || "";

  // Format dates like "Apr 28 - May 23"
  let dateRange = "";
  if (departureDate && returnDate) {
    const fmt = (d) => {
      const dt = new Date(d + "T12:00:00");
      return dt.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
    };
    const yearStart = new Date(departureDate + "T12:00:00").getFullYear();
    const yearEnd = new Date(returnDate + "T12:00:00").getFullYear();
    dateRange =
      fmt(departureDate) +
      " - " +
      fmt(returnDate) +
      (yearStart !== yearEnd ? " " + yearEnd : "") +
      " " +
      yearStart;
  }

  // Build notes from meals + incidentals detail
  const notesLines = [];
  if (data.mealsNote) notesLines.push(data.mealsNote);
  if (data.incidentalsNote) notesLines.push(data.incidentalsNote);
  if (data.groundTransportNote) notesLines.push("Ground Transport: " + data.groundTransportNote);

  // Transport rationale narrative
  let transportRationale = "";
  if (data.transportLabel) {
    transportRationale = data.transportNote || "";
    const tCost = data.transportCost || 0;
    transportRationale += `\nEstimated cost: $${tCost.toFixed(2)} CAD`;
  }
  // Append ground transport to rationale
  const groundTransportCAD = data.groundTransportCost || 0;
  if (groundTransportCAD > 0) {
    transportRationale += `\nGround Transport: $${groundTransportCAD.toFixed(2)} CAD`;
    if (data.groundTransportNote) {
      transportRationale += ` (${data.groundTransportNote})`;
    }
  }

  // Accommodation rationale narrative
  let accommodationRationale = data.accommodationNote || "";
  const accomCurr = data.accommodationCurrency || "CAD";
  const accomCost = data.accommodationCost || 0;
  accommodationRationale += `\n\nRate currency: ${accomCurr}`;
  if (accomCurr !== "CAD") {
    const cadVal = convertCurrency(accomCost, accomCurr, "CAD");
    accommodationRationale += ` (≈ $${cadVal.toFixed(2)} CAD)`;
  }

  // Cost columns (in CAD)
  const transportCAD = data.transportCost || 0;
  const accommodationCAD = convertCurrency(
    data.accommodationCost || 0,
    data.accommodationCurrency || "CAD",
    "CAD"
  );
  const mealsCAD = convertCurrency(
    data.mealsCost || 0,
    data.currency || "CAD",
    "CAD"
  );
  const incidentalsCAD = convertCurrency(
    data.incidentalsCost || 0,
    data.currency || "CAD",
    "CAD"
  );
  const totalCAD = data.totalCost || 0;

  return {
    serialNumber: 1,
    isEvent: "N",
    dates: dateRange,
    location: data.destinationCity || "",
    objective: "",
    travelCategory: "",
    cat5Detail: "",
    numPublicServants: 1,
    numNonPublicServants: 0,
    rationaleVirtual: "",
    travellerNames: "",
    rationaleNumTravellers: "",
    transportRationale: transportRationale,
    accommodationRationale: accommodationRationale,
    notes: notesLines.join("\n"),
    transportCost: Math.round((transportCAD + groundTransportCAD) * 100) / 100,
    accommodationCost: Math.round(accommodationCAD * 100) / 100,
    mealsCost: Math.round(mealsCAD * 100) / 100,
    incidentalsCost: Math.round(incidentalsCAD * 100) / 100,
    total: Math.round(totalCAD * 100) / 100,
    riskThreshold: "",

    // Extra metadata for CSV header
    departureCity: data.departureCity || "",
    destinationCity: data.destinationCity || "",
    destinationType: destinationType,
    departureDate: departureDate,
    returnDate: returnDate,
    numberOfDays: data.numberOfDays || 0,
    numberOfNights: data.numberOfNights || 0,
    transportMode: data.transportMode || "",
    flightDuration: data.flightDuration || 0,
    privateAccommodation: data.privateAccommodation || false,
    mealsCurrency: data.currency || "CAD",
    accommodationCurrency: data.accommodationCurrency || "CAD",
    rawAccommodationCost: data.accommodationCost || 0,
    rawMealsCost: data.mealsCost || 0,
    rawIncidentalsCost: data.incidentalsCost || 0,
    groundTransportCost: groundTransportCAD,
    groundTransportType: data.groundTransportType || "none",
    groundTransportNote: data.groundTransportNote || "",
  };
}

// ============================================================
// MDXTP XLSX Export (requires SheetJS loaded via CDN)
// ============================================================
function exportMDXTP() {
  const row = gatherMDXTPData();
  if (!row) {
    alert("Please calculate an estimate first.");
    return;
  }

  if (typeof XLSX === "undefined") {
    alert(
      "Excel export library not loaded. Falling back to CSV export."
    );
    exportMDXTPCSV();
    return;
  }

  const wb = XLSX.utils.book_new();

  // ---- MDXTP Sheet ----
  const headerRows = buildMDXTPHeaderRows();
  const dataRow = [
    row.serialNumber,
    row.isEvent,
    row.dates,
    row.location,
    row.objective,
    row.travelCategory,
    row.cat5Detail,
    row.numPublicServants,
    row.numNonPublicServants,
    row.rationaleVirtual,
    row.travellerNames,
    row.rationaleNumTravellers,
    row.transportRationale,
    row.accommodationRationale,
    row.notes,
    row.transportCost,
    row.accommodationCost,
    row.mealsCost,
    row.incidentalsCost,
    row.total,
    row.riskThreshold,
    "", // Comments
  ];

  // Totals row
  const totalsRow = [
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    row.transportCost,
    row.accommodationCost,
    row.mealsCost,
    row.incidentalsCost,
    row.total,
    "",
    "",
  ];

  const allRows = [...headerRows, dataRow, totalsRow];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths
  ws["!cols"] = [
    { wch: 8 }, // Serial #
    { wch: 10 }, // Event?
    { wch: 22 }, // Dates
    { wch: 24 }, // Location
    { wch: 40 }, // Objective
    { wch: 12 }, // Travel Cat
    { wch: 20 }, // Cat 5 Detail
    { wch: 12 }, // # Pub Servants
    { wch: 12 }, // # Non-Pub
    { wch: 30 }, // Rationale Virtual
    { wch: 24 }, // Names
    { wch: 24 }, // Rationale # Travellers
    { wch: 40 }, // Transport Rationale (F.1)
    { wch: 40 }, // Accommodation Rationale (G.1)
    { wch: 50 }, // Notes
    { wch: 16 }, // Transport Cost (F.2)
    { wch: 16 }, // Accommodation Cost (G.2)
    { wch: 14 }, // Meals (H)
    { wch: 18 }, // Incidentals (I)
    { wch: 14 }, // Total
    { wch: 12 }, // Risk (J)
    { wch: 20 }, // Comments
  ];

  // Merge title cells
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }, // Title row
    { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } }, // Subtitle row
    { s: { r: 3, c: 0 }, e: { r: 3, c: 14 } }, // GENERAL INFORMATION
    { s: { r: 3, c: 15 }, e: { r: 3, c: 19 } }, // COST BREAKDOWN
  ];

  XLSX.utils.book_append_sheet(wb, ws, "MDXTP");

  // ---- Summary Sheet ----
  const summaryData = [
    ["Government Travel Cost Estimate — Summary"],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ["Trip Details"],
    ["Departure City", row.departureCity],
    ["Destination City", row.destinationCity],
    ["Destination Type", row.destinationType],
    ["Departure Date", row.departureDate],
    ["Return Date", row.returnDate],
    ["Number of Days", row.numberOfDays],
    ["Number of Nights", row.numberOfNights],
    ["Transport Mode", row.transportMode],
    [],
    ["Cost Breakdown (CAD)"],
    ["Category", "Local Amount", "Currency", "CAD Amount"],
    [
      "Transportation",
      row.transportCost,
      "CAD",
      row.transportCost,
    ],
    [
      "Accommodation",
      row.rawAccommodationCost,
      row.accommodationCurrency,
      row.accommodationCost,
    ],
    [
      "Meals",
      row.rawMealsCost,
      row.mealsCurrency,
      row.mealsCost,
    ],
    [
      "Incidentals",
      row.rawIncidentalsCost,
      row.mealsCurrency,
      row.incidentalsCost,
    ],
    [],
    ["Total (CAD)", "", "", row.total],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2["!cols"] = [
    { wch: 20 },
    { wch: 18 },
    { wch: 10 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Summary");

  // Generate filename
  const dest = (row.destinationCity || "trip")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 20);
  const dateStr = row.departureDate || new Date().toISOString().slice(0, 10);
  const filename = `MDXTP_${dest}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

// ============================================================
// Build the MDXTP header rows (matching the official template)
// ============================================================
function buildMDXTPHeaderRows() {
  return [
    // Row 0: Title
    [
      "ADM(IM) MONTHLY DIVISIONAL EXPANDED TRAVEL PLAN (MDXTP)",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    // Row 1: Subtitle (destination type)
    [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    // Row 2: blank
    [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    // Row 3: Section headers
    [
      "GENERAL INFORMATION",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "COST BREAKDOWN (Estimated Costs in Canadian $ inclusive of all taxes)",
      "",
      "",
      "",
      "",
      "FOR DIVISIONAL USE",
      "FOR ADM(IM) USE ONLY",
    ],
    // Row 4: Column headers
    [
      "Serial #",
      "Is trip part of an event? Y/N",
      "Dates",
      "Location",
      "A\nObjective of the Travel",
      "B\nTravel Category",
      "Detailed Explanation for Travel Category 5 (other)",
      "C\n# public servants",
      "C\n# non-public servants",
      "D\nRationale for not utilizing Virtual Presence",
      "E\nName(s) of Travellers",
      "Rationale for Number of Travellers",
      "F.1.\nRationale for mode of transportation",
      "G.1.\nAccommodations Rationale",
      "Notes\n(specify Other Costs or relevant comments)",
      "F.2.\nTransport'n Cost",
      "G.2.\nAccomm'tn Cost",
      "H\nMeals Cost",
      "I\nIncidentals & Other Costs",
      "Total",
      "J\nApproval Assessment Parameters - Risk Threshold\n(Low / Medium / High)",
      "Comments",
    ],
    // Row 5: blank separator before data
    [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
  ];
}

// ============================================================
// MDXTP CSV Export (no library needed)
// ============================================================
function exportMDXTPCSV() {
  const row = gatherMDXTPData();
  if (!row) {
    alert("Please calculate an estimate first.");
    return;
  }

  const csvRows = [];

  // Title
  csvRows.push(["ADM(IM) MONTHLY DIVISIONAL EXPANDED TRAVEL PLAN (MDXTP)"]);
  csvRows.push([`Generated: ${new Date().toLocaleString()}`]);
  csvRows.push([]);

  // MDXTP Column headers
  csvRows.push([
    "Serial #",
    "Event? Y/N",
    "Dates",
    "Location",
    "Objective (A)",
    "Travel Category (B)",
    "Cat 5 Detail",
    "# Public Servants (C)",
    "# Non-Public Servants",
    "Rationale Virtual (D)",
    "Traveller Names (E)",
    "Rationale # Travellers",
    "Transport Rationale (F.1)",
    "Accommodation Rationale (G.1)",
    "Notes",
    "Transport Cost (F.2)",
    "Accommodation Cost (G.2)",
    "Meals Cost (H)",
    "Incidentals & Other (I)",
    "Total",
    "Risk Threshold (J)",
  ]);

  // Data row
  csvRows.push([
    row.serialNumber,
    row.isEvent,
    row.dates,
    row.location,
    row.objective,
    row.travelCategory,
    row.cat5Detail,
    row.numPublicServants,
    row.numNonPublicServants,
    row.rationaleVirtual,
    row.travellerNames,
    row.rationaleNumTravellers,
    row.transportRationale,
    row.accommodationRationale,
    row.notes,
    row.transportCost,
    row.accommodationCost,
    row.mealsCost,
    row.incidentalsCost,
    row.total,
    row.riskThreshold,
  ]);

  csvRows.push([]);

  // Totals
  csvRows.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    row.transportCost,
    row.accommodationCost,
    row.mealsCost,
    row.incidentalsCost,
    row.total,
    "",
  ]);

  csvRows.push([]);
  csvRows.push([]);

  // --- Additional trip detail section ---
  csvRows.push(["TRIP DETAILS"]);
  csvRows.push(["Departure City", row.departureCity]);
  csvRows.push(["Destination City", row.destinationCity]);
  csvRows.push(["Destination Type", row.destinationType]);
  csvRows.push(["Departure Date", row.departureDate]);
  csvRows.push(["Return Date", row.returnDate]);
  csvRows.push(["Number of Days", row.numberOfDays]);
  csvRows.push(["Number of Nights", row.numberOfNights]);
  csvRows.push(["Transport Mode", row.transportMode]);
  if (row.flightDuration) {
    csvRows.push(["Flight Duration (hours)", row.flightDuration]);
  }
  csvRows.push([]);

  // Cost breakdown with currency detail
  csvRows.push(["COST BREAKDOWN"]);
  csvRows.push(["Category", "Local Amount", "Currency", "CAD Amount"]);
  csvRows.push([
    "Transportation",
    row.transportCost,
    "CAD",
    row.transportCost,
  ]);
  csvRows.push([
    "Accommodation",
    row.rawAccommodationCost,
    row.accommodationCurrency,
    row.accommodationCost,
  ]);
  csvRows.push([
    "Meals",
    row.rawMealsCost,
    row.mealsCurrency,
    row.mealsCost,
  ]);
  csvRows.push([
    "Incidentals",
    row.rawIncidentalsCost,
    row.mealsCurrency,
    row.incidentalsCost,
  ]);
  csvRows.push([]);
  csvRows.push(["Total (CAD)", "", "", row.total]);

  // Escape and build CSV string
  const escape = (val) => {
    const s = String(val == null ? "" : val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const csvString = csvRows.map((r) => r.map(escape).join(",")).join("\n");

  // Download
  const dest = (row.destinationCity || "trip")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 20);
  const dateStr = row.departureDate || new Date().toISOString().slice(0, 10);
  const filename = `MDXTP_${dest}_${dateStr}.csv`;

  const blob = new Blob(["\uFEFF" + csvString], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
