// ========================================
// SCRIPT INITIALIZATION - Verify Loading
// ========================================
/* global exportToCSV, exportMDXTP, exportMDXTPCSV, XLSX */
/* eslint-disable no-useless-assignment */
console.log("🔥 script.js is LOADING...");

// Global variables for database
let perDiemRatesDB = null;
let accommodationRatesDB = null;
let transportationRatesDB = null;
const MAX_CITY_SUGGESTIONS = 20;
let citySuggestionPool = [];
let baseCityListOptions = [];
let ALL_CITIES = []; // Loaded from database API

// Business class multiplier
const BUSINESS_CLASS_MULTIPLIER = 2.5;
const BUSINESS_CLASS_THRESHOLD_HOURS = 9;

// Load databases
async function loadDatabases() {
  try {
    // City/accommodation lookups go through the server API; only the two small
    // rate files are shipped to the browser. accommodationRates.json (~large)
    // is lazily fetched as a fallback only if the API is unavailable.
    const [perDiemResponse, transportationResponse] = await Promise.all([
      fetch("data/perDiemRates.json"),
      fetch("data/transportationRates.json"),
    ]);

    if (!perDiemResponse.ok || !transportationResponse.ok) {
      throw new Error("Failed to load rate databases");
    }

    perDiemRatesDB = await perDiemResponse.json();
    transportationRatesDB = await transportationResponse.json();

    // Update metadata display if databases loaded successfully
    updateMetadataDisplay();

    return true;
  } catch (error) {
    console.error("Error loading databases:", error);
    alert("Error loading rate databases. Please refresh the page.");
    return false;
  }
}

function updateMetadataDisplay() {
  if (perDiemRatesDB && perDiemRatesDB.metadata) {
    const footer = document.querySelector("footer p");
    if (footer) {
      footer.textContent = `Based on NJC Travel Directive effective ${perDiemRatesDB.metadata.effectiveDate} (Rates updated: ${perDiemRatesDB.metadata.lastUpdated})`;
    }
  }

  // Validate rates and show warnings if needed
  validateRatesAndShowWarnings();
}

// Validate database dates and show warnings
function validateRatesAndShowWarnings() {
  const warnings = [];
  const today = new Date();

  // Check per diem rates
  if (perDiemRatesDB && perDiemRatesDB.metadata) {
    const lastUpdated = new Date(perDiemRatesDB.metadata.lastUpdated);
    const monthsSinceUpdate =
      (today - lastUpdated) / (1000 * 60 * 60 * 24 * 30);

    if (monthsSinceUpdate > 12) {
      warnings.push({
        type: "outdated",
        database: "Per Diem Rates",
        message: `Per diem rates were last updated ${lastUpdated.toLocaleDateString()} (${Math.floor(
          monthsSinceUpdate
        )} months ago). Please verify current rates.`,
        lastUpdated: perDiemRatesDB.metadata.lastUpdated,
      });
    } else if (monthsSinceUpdate > 10) {
      warnings.push({
        type: "warning",
        database: "Per Diem Rates",
        message: `Per diem rates approaching update cycle. Last updated ${lastUpdated.toLocaleDateString()}.`,
        lastUpdated: perDiemRatesDB.metadata.lastUpdated,
      });
    }
  }

  // Check accommodation rates
  if (accommodationRatesDB && accommodationRatesDB.metadata) {
    const lastUpdated = new Date(accommodationRatesDB.metadata.lastUpdated);
    const monthsSinceUpdate =
      (today - lastUpdated) / (1000 * 60 * 60 * 24 * 30);

    if (monthsSinceUpdate > 6) {
      warnings.push({
        type: "info",
        database: "Accommodation Rates",
        message: `Accommodation rates were last updated ${lastUpdated.toLocaleDateString()}. Verify current rates for specific cities.`,
        lastUpdated: accommodationRatesDB.metadata.lastUpdated,
      });
    }
  }

  // Check transportation rates
  if (transportationRatesDB && transportationRatesDB.metadata) {
    const lastUpdated = new Date(transportationRatesDB.metadata.lastUpdated);
    const monthsSinceUpdate =
      (today - lastUpdated) / (1000 * 60 * 60 * 24 * 30);

    if (monthsSinceUpdate > 12) {
      warnings.push({
        type: "outdated",
        database: "Transportation Rates",
        message: `Kilometric rates were last updated ${lastUpdated.toLocaleDateString()} (${Math.floor(
          monthsSinceUpdate
        )} months ago). Please verify current rates.`,
        lastUpdated: transportationRatesDB.metadata.lastUpdated,
      });
    }
  }

  // Display warnings if any (but respect session dismissal)
  if (warnings.length > 0 && shouldShowWarning()) {
    displayRateWarnings(warnings);
  }

  return warnings;
}

// Display rate validation warnings
function displayRateWarnings(warnings) {
  // Check if warning banner already exists
  let warningBanner = document.getElementById("rateWarningBanner");

  if (!warningBanner) {
    warningBanner = document.createElement("div");
    warningBanner.id = "rateWarningBanner";
    warningBanner.className = "rate-warning-banner";

    // Insert after header
    const header = document.querySelector("header");
    header.parentNode.insertBefore(warningBanner, header.nextSibling);
  }

  // Build warning content
  let content = '<div class="warning-content">';
  content += "<h3>⚠️ Rate Validation Notice</h3>";

  warnings.forEach((warning) => {
    const alertClass =
      warning.type === "outdated"
        ? "alert-danger"
        : warning.type === "warning"
          ? "alert-warning"
          : "alert-info";
    content += `<div class="rate-alert ${alertClass}">`;
    content += `<strong>${warning.database}:</strong> ${warning.message}`;
    content += "</div>";
  });

  content +=
    '<p class="warning-footer">Please consult official NJC sources to verify current rates: ';
  content +=
    '<a href="https://www.njc-cnm.gc.ca/directive/d10/en" target="_blank">NJC Travel Directive</a></p>';
  content +=
    '<button class="btn-dismiss" id="dismissWarningBtn">Dismiss</button>';
  content += "</div>";

  warningBanner.innerHTML = content;
  warningBanner.style.display = "block";

  // Attach click listener (CSP-safe)
  const dismissBtn = document.getElementById("dismissWarningBtn");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", dismissWarningBanner);
  }
}

// Dismiss warning banner
function dismissWarningBanner() {
  const banner = document.getElementById("rateWarningBanner");
  if (banner) {
    banner.style.display = "none";
    // Store dismissal in session storage
    sessionStorage.setItem("warningDismissed", "true");
  }
}

// Check if warning was dismissed this session
function shouldShowWarning() {
  return !sessionStorage.getItem("warningDismissed");
}

// Form elements
const form = document.getElementById("travelForm");
const resultsSection = document.getElementById("results");

// Result elements
const totalCostEl = document.getElementById("totalCost");
const transportLabelEl = document.getElementById("transportLabel");
const transportCostEl = document.getElementById("transportCost");
const transportNoteEl = document.getElementById("transportNote");
const accommodationCostEl = document.getElementById("accommodationCost");
const accommodationNoteEl = document.getElementById("accommodationNote");
const mealsCostEl = document.getElementById("mealsCost");
const mealsNoteEl = document.getElementById("mealsNote");
const incidentalsCostEl = document.getElementById("incidentalsCost");
const incidentalsNoteEl = document.getElementById("incidentalsNote");
const groundTransportCostEl = document.getElementById("groundTransportCostEl");
const groundTransportNoteEl = document.getElementById("groundTransportNote");
const groundTransportLabelEl = document.getElementById("groundTransportLabel");
const groundTransportBreakdown = document.getElementById("groundTransportBreakdown");

// Event listeners
form.addEventListener("submit", handleFormSubmit);
form.addEventListener("reset", handleFormReset);

// Normalize region strings from database/API to the keys used in perDiemRatesDB
function normalizeRegion(region) {
  if (!region) return "international";

  const key = region.toLowerCase();
  const map = {
    europe: "international",
    asia: "international",
    africa: "international",
    oceania: "international",
    "middle east": "international",
    middleeast: "international",
    "south america": "international",
    "central america": "international",
    caribbean: "international",
  };

  if (map[key]) return map[key];

  const allowed = new Set([
    "canada",
    "yukon",
    "nwt",
    "nunavut",
    "usa",
    "alaska",
    "international",
  ]);

  if (allowed.has(key)) return key;

  return "international";
}

// Helper function to get allowances from database
function getAllowancesForRegion(destinationType) {
  const regionKey = normalizeRegion(destinationType);

  if (!perDiemRatesDB || !perDiemRatesDB.regions[regionKey]) {
    console.warn(
      `Region ${destinationType} not found in database, using international as default`
    );
    return {
      breakfast: 29.5,
      lunch: 30.05,
      dinner: 61.7,
      incidental: 25.0,
      privateAccommodation: 50.0,
    };
  }

  const region = perDiemRatesDB.regions[regionKey];
  return {
    breakfast: region.meals.breakfast.rate100,
    lunch: region.meals.lunch.rate100,
    dinner: region.meals.dinner.rate100,
    incidental: region.incidentals.rate100,
    privateAccommodation: region.privateAccommodation.day1to120,
    currency: region.currency,
  };
}

// ---------------------------------------------------------------------------
// Server API access with lazy JSON fallback
// ---------------------------------------------------------------------------

function debounce(fn, delayMs) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delayMs);
  };
}

async function apiGet(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API ${response.status} for ${url}`);
  return response.json();
}

// Lazily fetch the full accommodation JSON only when the API is unreachable
async function loadAccommodationFallback() {
  if (accommodationRatesDB) return accommodationRatesDB;
  console.warn("API unavailable — falling back to bundled rate JSON");
  const response = await fetch("data/accommodationRates.json");
  if (!response.ok) throw new Error("Fallback rate JSON unavailable");
  accommodationRatesDB = await response.json();
  loadCitiesFromJSON();
  return accommodationRatesDB;
}

// Map an /api/accommodation response row to the legacy JSON entry shape the
// calculation code was written against.
function adaptApiRate(row) {
  if (!row) return null;
  return {
    name: row.name,
    province: row.province,
    country: row.country,
    region: row.region, // region code: canada/yukon/nwt/nunavut/usa/alaska/international
    currency: row.accommodation_currency,
    monthlyRates: row.accommodation ? row.accommodation.monthly : null,
    standardRate: row.accommodation ? row.accommodation.standard : null,
    meals: row.meals,
    mealsCurrency: row.currency,
    incidentals: row.incidentals,
  };
}

// Helper function to get accommodation rate suggestion (API-first)
async function getAccommodationSuggestion(destinationCity) {
  try {
    const data = await apiGet(
      `/api/accommodation/search?city=${encodeURIComponent(destinationCity)}`
    );
    const results = data.results || [];
    return adaptApiRate(results[0]);
  } catch (error) {
    if (!String(error.message).includes("API 404")) {
      // API down (not just an unknown city): use the bundled JSON
      try {
        await loadAccommodationFallback();
        return getAccommodationSuggestionLocal(destinationCity);
      } catch (fallbackError) {
        console.error("Rate lookup failed:", fallbackError);
      }
    }
    return null;
  }
}

// Legacy client-side lookup, kept as the offline/API-down fallback path
function getAccommodationSuggestionLocal(destinationCity) {
  if (!accommodationRatesDB) return null;

  // Normalize city name to match database key format
  const normalizeCity = (city) => {
    return city
      .toLowerCase()
      .replace(/,.*$/, "") // Remove everything after comma
      .replace(/[^a-z0-9\s]/g, "") // Remove special characters
      .trim()
      .replace(/\s+/g, ""); // Remove spaces
  };

  const cityKey = normalizeCity(destinationCity);

  if (accommodationRatesDB.cities && accommodationRatesDB.cities[cityKey]) {
    return accommodationRatesDB.cities[cityKey];
  }

  if (
    accommodationRatesDB.internationalCities &&
    accommodationRatesDB.internationalCities[cityKey]
  ) {
    return accommodationRatesDB.internationalCities[cityKey];
  }

  return null;
}

async function handleFormSubmit(e) {
  e.preventDefault();

  // Get form values
  const departureCity = document.getElementById("departureCity").value.trim();
  const destinationCity = document
    .getElementById("destinationCity")
    .value.trim();

  // Validate cities are filled
  if (!departureCity || !destinationCity) {
    alert("Please enter both departure and destination cities.");
    return;
  }

  // Validate both cities exist
  const departureCityValid =
    document.getElementById("departureCity").dataset.valid === "true";
  const destinationCityValid =
    document.getElementById("destinationCity").dataset.valid === "true";

  if (!departureCityValid || !destinationCityValid) {
    // Try to validate if not already done
    if (!departureCityValid) {
      alert(
        `"${departureCity}" is not a valid city. Please check the spelling.`
      );
      return;
    }
    if (!destinationCityValid) {
      alert(
        `"${destinationCity}" is not a valid city. Please check the spelling.`
      );
      return;
    }
  }

  const departureDate = new Date(
    document.getElementById("departureDate").value
  );
  const returnDate = new Date(document.getElementById("returnDate").value);
  const destinationType = document.getElementById("destinationType").value;
  const transportMode = document.getElementById("transportMode").value;

  // Get transport-specific values
  let flightDuration = 0;
  let estimatedTransportCost = 0;
  let distanceKm = 0;
  let customAllowances = null;

  if (transportMode === "flight") {
    flightDuration = parseFloat(
      document.getElementById("flightDuration").value
    );
    estimatedTransportCost =
      parseFloat(document.getElementById("estimatedFlightCost").value) || 0;
  } else if (transportMode === "vehicle") {
    distanceKm = parseFloat(document.getElementById("distanceKm").value);
  } else if (transportMode === "train") {
    estimatedTransportCost =
      parseFloat(document.getElementById("estimatedTrainCost").value) || 0;
  }

  // Read ground transport values
  const groundTransportType = document.getElementById("groundTransportType").value;
  let groundTransportCost = 0;
  let groundTransportNote = "";
  if (groundTransportType !== "none" && (transportMode === "flight" || transportMode === "train")) {
    const originCost = parseFloat(document.getElementById("originGroundCost").value) || 0;
    const destCost = parseFloat(document.getElementById("destinationGroundCost").value) || 0;
    const includeReturn = document.getElementById("groundTransportReturn").checked;
    const multiplier = includeReturn ? 2 : 1;
    groundTransportCost = (originCost + destCost) * multiplier;
    const typeLabel = groundTransportType === "taxi" ? "Taxi/Rideshare" : "Car Rental";
    const tripLabel = includeReturn ? "round-trip" : "one-way";
    const parts = [];
    if (originCost > 0) parts.push(`Home ↔ Airport: $${(originCost * multiplier).toFixed(2)}`);
    if (destCost > 0) parts.push(`Airport ↔ Hotel: $${(destCost * multiplier).toFixed(2)}`);
    groundTransportNote = `${typeLabel} (${tripLabel}): ${parts.join(" + ")}`;
  }

  let accommodationPerNight = parseFloat(
    document.getElementById("estimatedAccommodationPerNight").value
  );
  const privateAccommodation = document.getElementById(
    "privateAccommodation"
  ).checked;

  // Validate dates
  if (returnDate <= departureDate) {
    alert("Return date must be after departure date!");
    return;
  }

  // Auto-lookup accommodation rate via the server API (JSON fallback inside)
  let destinationRegion = destinationType; // Start with user-selected type
  const rateData = await getAccommodationSuggestion(destinationCity);

  if (!accommodationPerNight && !privateAccommodation) {
    if (rateData) {
      // Get rate - use standardRate for international, monthly rate for Canadian cities
      const currentMonth = new Date(
        document.getElementById("departureDate").value
      ).getMonth();
      accommodationPerNight =
        rateData.standardRate ||
        (rateData.monthlyRates && rateData.monthlyRates[currentMonth]) ||
        100;
      destinationRegion = normalizeRegion(rateData.region || destinationType);

      // Use city-specific allowances
      if (rateData.meals) {
        customAllowances = {
          breakfast: rateData.meals.breakfast,
          lunch: rateData.meals.lunch,
          dinner: rateData.meals.dinner,
          incidental: rateData.incidentals,
          currency: rateData.mealsCurrency || rateData.currency,
          accommodationCurrency: rateData.currency || (rateData.country === "Canada" ? "CAD" : "USD"),
          privateAccommodation: 50.0,
        };
      }
      document.getElementById("estimatedAccommodationPerNight").value =
        accommodationPerNight.toFixed(2);
    } else {
      alert(
        `Unable to find accommodation rate for "${destinationCity}". Please enter rate manually or check the city spelling.`
      );
      return;
    }
  } else if (accommodationPerNight && rateData) {
    // If accommodation is already populated, still detect the region for per diem rates
    destinationRegion = normalizeRegion(rateData.region || destinationType);

    if (rateData.meals) {
      customAllowances = {
        breakfast: rateData.meals.breakfast,
        lunch: rateData.meals.lunch,
        dinner: rateData.meals.dinner,
        incidental: rateData.incidentals,
        currency: rateData.mealsCurrency || rateData.currency,
        accommodationCurrency: rateData.currency || (rateData.country === "Canada" ? "CAD" : "USD"),
        privateAccommodation: 50.0,
      };
    }
  }

  // Calculate number of days
  const timeDiff = returnDate.getTime() - departureDate.getTime();
  const numberOfDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  const numberOfNights = numberOfDays;

  // Calculate costs with city-specific allowances if available
  const costs = calculateCosts(
    {
      destinationType: destinationRegion, // Use detected region instead of dropdown selection
      transportMode,
      flightDuration,
      estimatedTransportCost,
      distanceKm,
      accommodationPerNight,
      numberOfDays,
      numberOfNights,
      privateAccommodation,
      groundTransportCost,
      groundTransportNote,
      groundTransportType,
    },
    customAllowances // PASS the city-specific allowances here!
  );

  // Display results
  const travelInfo = {
    departureCity,
    destinationCity,
    numberOfDays,
    numberOfNights,
    transportMode,
    flightDuration,
    distanceKm,
    privateAccommodation,
    groundTransportType,
  };
  displayResults(costs, travelInfo);

  // Store data for CSV export and trip history
  storeEstimateData({ ...costs, ...travelInfo });
}

function calculateCosts(params, customAllowances = null) {
  const {
    destinationType,
    transportMode,
    flightDuration,
    estimatedTransportCost,
    distanceKm,
    accommodationPerNight,
    numberOfDays,
    numberOfNights,
    privateAccommodation,
    groundTransportCost = 0,
    groundTransportNote = "",
    groundTransportType = "none",
  } = params;

  // Use city-specific allowances if provided; otherwise fall back to region defaults
  const allowances =
    customAllowances || getAllowancesForRegion(destinationType);

  // Calculate transportation cost
  let transportCost = 0;
  let transportNote = "";
  let transportLabel = "Transportation";

  if (transportMode === "flight") {
    transportLabel = "Flight Cost";
    if (flightDuration >= BUSINESS_CLASS_THRESHOLD_HOURS) {
      transportCost = estimatedTransportCost * BUSINESS_CLASS_MULTIPLIER;
      transportNote = `Business class applicable (longest leg ${flightDuration} hours ≥ 9 hours). Estimated at ${BUSINESS_CLASS_MULTIPLIER}x economy cost per NJC Directive Section 3.3.11/3.4.11`;
    } else {
      transportCost = estimatedTransportCost;
      transportNote = `Economy class flight (longest leg ${flightDuration} hours < 9 hours). Per NJC Directive Section 3.3.11/3.4.11`;
    }
  } else if (transportMode === "vehicle") {
    transportLabel = "Personal Vehicle";
    const provinceSelect = document.getElementById("vehicleProvince");
    const province = provinceSelect ? provinceSelect.value : "ON";
    const provinceRates = transportationRatesDB
      ? transportationRatesDB.kilometricRates.provinces
      : null;
    const provinceEntry = provinceRates ? provinceRates[province] : null;
    const kmRate = provinceEntry ? provinceEntry.ratePerKm : 0.655;
    const provinceName = provinceEntry ? provinceEntry.name : province;
    transportCost = distanceKm * kmRate;
    transportNote = `Kilometric rate: $${kmRate.toFixed(
      3
    )}/km × ${distanceKm} km (${provinceName} — province of vehicle registration, NJC Appendix B). Parking and tolls may be additional.`;
  } else if (transportMode === "train") {
    transportLabel = "Train Cost";
    transportCost = estimatedTransportCost;
    transportNote =
      "Economy class estimate. Business class may be authorized with approval for extended travel or work requirements.";
  }

  // Calculate accommodation cost
  let accommodationCost = 0;
  let accommodationNote = "";

  if (privateAccommodation) {
    // Private non-commercial accommodation allowance
    accommodationCost = allowances.privateAccommodation * numberOfNights;
    accommodationNote = `Private accommodation allowance: $${allowances.privateAccommodation.toFixed(
      2
    )}/night × ${numberOfNights} nights`;
  } else {
    accommodationCost = accommodationPerNight * numberOfNights;
    accommodationNote = `Hotel estimate: $${accommodationPerNight.toFixed(
      2
    )}/night × ${numberOfNights} nights. Verify rates at government accommodation directory`;
  }

  // Calculate meal allowances
  const dailyMealAllowance =
    allowances.breakfast + allowances.lunch + allowances.dinner;
  const mealsCost = dailyMealAllowance * numberOfDays;
  const mealsNote = `Daily meal allowance: Breakfast $${allowances.breakfast.toFixed(
    2
  )} + Lunch $${allowances.lunch.toFixed(
    2
  )} + Dinner $${allowances.dinner.toFixed(2)} = $${dailyMealAllowance.toFixed(
    2
  )} × ${numberOfDays} days`;

  // Calculate incidental expenses
  const incidentalsCost = allowances.incidental * numberOfDays;
  const incidentalsNote = `Incidental allowance: $${allowances.incidental.toFixed(
    2
  )}/day × ${numberOfDays} days`;

  // Calculate total in CAD
  // We need to convert each component to CAD based on its specific currency
  const transportCAD = transportCost; // Assumed CAD
  const accommodationCAD = convertCurrency(accommodationCost, allowances.accommodationCurrency || "USD", "CAD");
  const mealsCAD = convertCurrency(mealsCost, allowances.currency || "CAD", "CAD");
  const incidentalsCAD = convertCurrency(incidentalsCost, allowances.currency || "CAD", "CAD");
  const groundTransportCAD = groundTransportCost; // Already in CAD

  const totalCost = transportCAD + accommodationCAD + mealsCAD + incidentalsCAD + groundTransportCAD;

  return {
    transportCost,
    transportNote,
    transportLabel,
    groundTransportCost,
    groundTransportNote,
    groundTransportType,
    accommodationCost,
    accommodationNote,
    mealsCost,
    mealsNote,
    incidentalsCost,
    incidentalsNote,
    totalCost, // Now strictly in CAD
    currency: allowances.currency || "CAD",
    accommodationCurrency: allowances.accommodationCurrency || "USD",
  };
}

// Exchange rates (USD as base)
const EXCHANGE_RATES = {
  CAD: 1.0,
  USD: 0.72,
  EUR: 0.92,
};

function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  if (!EXCHANGE_RATES[fromCurrency] || !EXCHANGE_RATES[toCurrency]) {
    return amount; // Return unchanged if rate not available
  }
  // Convert through USD as base
  const amountInUSD = amount / EXCHANGE_RATES[fromCurrency];
  return amountInUSD * EXCHANGE_RATES[toCurrency];
}

function formatCurrencyAmount(amount, currency, showSecondary = false) {
  const primary = `${currency} ${amount.toFixed(2)}`;
  if (!showSecondary || currency === "CAD") {
    return primary;
  }
  const cadAmount = convertCurrency(amount, currency, "CAD");
  return `${primary} (CAD ${cadAmount.toFixed(2)})`;
}

function displayResults(costs, travelInfo) {
  // Update cost values with optional CAD conversion
  const currencyLabel = costs.currency || "CAD";
  const accomCurrencyLabel = costs.accommodationCurrency || "USD";

  const showCADConversion = currencyLabel !== "CAD";
  const showAccomCADConversion = accomCurrencyLabel !== "CAD";

  totalCostEl.textContent = formatCurrencyAmount(
    costs.totalCost,
    "CAD",
    false
  );



  transportLabelEl.textContent = costs.transportLabel;
  transportCostEl.textContent = formatCurrencyAmount(
    costs.transportCost,
    "CAD", // Flights are usually booked in home currency or converted early
    false
  );

  transportNoteEl.textContent = costs.transportNote;

  // Ground transport breakdown
  if (costs.groundTransportCost > 0) {
    groundTransportBreakdown.style.display = "block";
    const typeLabel = costs.groundTransportType === "taxi" ? "Taxi/Rideshare" : "Car Rental";
    groundTransportLabelEl.textContent = `Ground Transport (${typeLabel})`;
    groundTransportCostEl.textContent = formatCurrencyAmount(
      costs.groundTransportCost,
      "CAD",
      false
    );
    groundTransportNoteEl.textContent = costs.groundTransportNote;
  } else {
    groundTransportBreakdown.style.display = "none";
  }

  accommodationCostEl.textContent = formatCurrencyAmount(
    costs.accommodationCost,
    accomCurrencyLabel,
    showAccomCADConversion
  );
  accommodationNoteEl.textContent = costs.accommodationNote;

  mealsCostEl.textContent = formatCurrencyAmount(
    costs.mealsCost,
    currencyLabel,
    showCADConversion
  );
  mealsNoteEl.textContent = costs.mealsNote;

  incidentalsCostEl.textContent = formatCurrencyAmount(
    costs.incidentalsCost,
    currencyLabel,
    showCADConversion
  );
  incidentalsNoteEl.textContent = costs.incidentalsNote;

  // Show results section
  resultsSection.classList.remove("hidden");

  // Smooth scroll to results
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 100);
}

function handleFormReset() {
  // Hide results section
  resultsSection.classList.add("hidden");
}

// Validate city exists in database
async function validateCity(inputId) {
  const input = document.getElementById(inputId);
  const statusId =
    inputId === "departureCity"
      ? "departureCityStatus"
      : "destinationCityStatus";
  const status = document.getElementById(statusId);
  const city = input.value.trim();

  if (!city) {
    status.style.display = "none";
    input.style.borderColor = "";
    return;
  }

  // Normalize: lowercase, collapse whitespace, remove extra spaces around commas
  const normalize = (s) => s.toLowerCase().replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ").trim();
  const normalCity = normalize(city);

  let candidates;
  try {
    // Validate against the server API (searches display name and key)
    const data = await apiGet(
      `/api/autocomplete?q=${encodeURIComponent(city.split(",")[0].trim())}&limit=25`
    );
    candidates = (data.suggestions || []).map((s) => s.city_name);
  } catch {
    // API down: validate against the bundled JSON city list
    try {
      await loadAccommodationFallback();
    } catch {
      /* ALL_CITIES stays as-is */
    }
    candidates = ALL_CITIES;
  }

  // Exact match on full name (e.g., "Ottawa, ON")
  let match = candidates.find((c) => normalize(c) === normalCity);

  // Partial match: user typed just the city name (e.g., "Ottawa")
  if (!match) {
    match = candidates.find((c) => normalize(c).startsWith(normalCity + ","));
  }

  // Loose match: city name contains the input
  if (!match) {
    match = candidates.find((c) => normalize(c).includes(normalCity));
  }

  if (match) {
    // Auto-fill the full city name if user typed a partial match
    if (normalize(match) !== normalCity) {
      input.value = match;
    }
    status.textContent = `✅ ${match} found`;
    status.style.color = "#2e7d32";
    status.style.display = "block";
    input.style.borderColor = "#2e7d32";
    input.dataset.valid = "true";
  } else {
    status.textContent = `❌ City not found. Check spelling or try a nearby major city`;
    status.style.color = "#c62828";
    status.style.display = "block";
    input.style.borderColor = "#c62828";
    input.dataset.valid = "false";
  }
}

// City suggestions: server autocomplete with bundled-JSON fallback
async function showCitySuggestions(query, suggestionsId, inputId) {
  const suggestionsDiv = document.getElementById(suggestionsId);
  if (!suggestionsDiv) {
    return;
  }

  // Hide if query is too short
  if (!query || query.length < 2) {
    suggestionsDiv.style.display = "none";
    return;
  }

  let matches;
  try {
    const data = await apiGet(
      `/api/autocomplete?q=${encodeURIComponent(query)}&limit=${MAX_CITY_SUGGESTIONS}`
    );
    matches = (data.suggestions || []).map((s) => s.city_name);
  } catch {
    try {
      await loadAccommodationFallback();
    } catch {
      /* ALL_CITIES stays as-is */
    }
    const lowerQuery = query.toLowerCase();
    matches = ALL_CITIES.filter((city) =>
      city.toLowerCase().includes(lowerQuery)
    ).slice(0, MAX_CITY_SUGGESTIONS);
  }

  if (matches.length === 0) {
    suggestionsDiv.innerHTML =
      '<div class="city-suggestion-item">No cities found</div>';
    suggestionsDiv.style.display = "block";
    return;
  }

  // Build HTML for suggestions using data attributes (no inline onclick due to CSP)
  suggestionsDiv.innerHTML = matches
    .map(
      (city) =>
        `<div class="city-suggestion-item" data-city="${city.replace(/"/g, '&quot;')}" data-input="${inputId}">${city}</div>`
    )
    .join("");

  // Attach click handlers via event delegation
  suggestionsDiv.querySelectorAll(".city-suggestion-item[data-city]").forEach((item) => {
    item.addEventListener("click", function () {
      selectCity(this.dataset.city, this.dataset.input);
    });
  });

  suggestionsDiv.style.display = "block";
}

// Select a city and populate the input
function selectCity(cityName, inputId) {
  document.getElementById(inputId).value = cityName;

  // Hide suggestions
  const suggestionsId =
    inputId === "departureCity"
      ? "departureCitySuggestions"
      : "destinationCitySuggestions";
  document.getElementById(suggestionsId).style.display = "none";

  // Run validation to show green checkmark
  validateCity(inputId);

  // Trigger accommodation lookup for destination city
  if (inputId === "destinationCity") {
    handleDestinationInput();
  }
}

// Hide suggestions when clicking outside
document.addEventListener("click", function (event) {
  const departureSuggestions = document.getElementById(
    "departureCitySuggestions"
  );
  const destinationSuggestions = document.getElementById(
    "destinationCitySuggestions"
  );
  const departureCity = document.getElementById("departureCity");
  const destinationCity = document.getElementById("destinationCity");

  if (event.target !== departureCity && departureSuggestions) {
    departureSuggestions.style.display = "none";
  }
  if (event.target !== destinationCity && destinationSuggestions) {
    destinationSuggestions.style.display = "none";
  }
});

// Build ALL_CITIES from the already-loaded JSON data
function loadCitiesFromJSON() {
  try {
    if (!accommodationRatesDB) {
      console.warn("accommodationRatesDB not loaded yet");
      ALL_CITIES = [];
      return;
    }

    const citySet = new Set();

    // Canadian cities from accommodationRatesDB.cities
    if (accommodationRatesDB.cities) {
      Object.values(accommodationRatesDB.cities).forEach((city) => {
        if (city && city.name) {
          citySet.add(city.name);
        }
      });
    }

    // International cities from accommodationRatesDB.internationalCities
    if (accommodationRatesDB.internationalCities) {
      Object.values(accommodationRatesDB.internationalCities).forEach((city) => {
        if (city && city.name) {
          citySet.add(city.name);
        }
      });
    }

    ALL_CITIES = Array.from(citySet).sort((a, b) => a.localeCompare(b));
    console.log(`Loaded ${ALL_CITIES.length} cities from JSON data`);
  } catch (error) {
    console.error("Error loading cities from JSON:", error);
    ALL_CITIES = [];
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const loaded = await loadDatabases();
  if (!loaded) {
    console.error("Failed to load databases");
  }
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("departureDate").setAttribute("min", today);
  document.getElementById("returnDate").setAttribute("min", today);

  // Update return date minimum when departure date changes
  document.getElementById("departureDate").addEventListener("change", (e) => {
    const departureDate = e.target.value;
    document.getElementById("returnDate").setAttribute("min", departureDate);
  });

  // Handle destination input (debounced — triggers an API rate lookup)
  document
    .getElementById("destinationCity")
    .addEventListener("input", debounce(handleDestinationInput, 350));

  document
    .getElementById("destinationType")
    .addEventListener("change", handleDestinationInput);

  // Handle transport mode change
  document
    .getElementById("transportMode")
    .addEventListener("change", handleTransportModeChange);

  // Handle ground transport type change
  document
    .getElementById("groundTransportType")
    .addEventListener("change", handleGroundTransportTypeChange);

  // Handle automatic flight search
  document
    .getElementById("searchFlightsBtn")
    .addEventListener("click", handleFlightSearch);

  // Handle departure/destination for Google Flights link (debounced)
  const debouncedFlightsLink = debounce(updateGoogleFlightsLink, 300);
  document
    .getElementById("departureCity")
    .addEventListener("input", debouncedFlightsLink);
  document
    .getElementById("destinationCity")
    .addEventListener("input", debouncedFlightsLink);
  document
    .getElementById("departureDate")
    .addEventListener("change", updateGoogleFlightsLink);
  document
    .getElementById("returnDate")
    .addEventListener("change", updateGoogleFlightsLink);

  // Attach city suggestion listeners, debounced so a fast typist triggers one
  // API call per pause instead of one per keystroke
  const debouncedSuggest = debounce(showCitySuggestions, 250);
  document
    .getElementById("departureCity")
    .addEventListener("input", function () {
      debouncedSuggest(this.value, "departureCitySuggestions", "departureCity");
    });
  document
    .getElementById("destinationCity")
    .addEventListener("input", function () {
      debouncedSuggest(this.value, "destinationCitySuggestions", "destinationCity");
    });

  // City validation listeners moved outside DOMContentLoaded to avoid timing issues

  // Button listeners (removed inline onclick from HTML for CSP compliance)
  const exportMdxtpBtn = document.getElementById("exportMdxtpBtn");
  if (exportMdxtpBtn) exportMdxtpBtn.addEventListener("click", () => exportMDXTP());

  const exportBtn = document.getElementById("exportCsvBtn");
  if (exportBtn) exportBtn.addEventListener("click", () => exportMDXTPCSV());

  const printBtn = document.getElementById("printBtn");
  if (printBtn) printBtn.addEventListener("click", () => printEstimate());

  const voiceCancelBtn = document.getElementById("voiceCancelBtn");
  if (voiceCancelBtn) voiceCancelBtn.addEventListener("click", () => stopVoiceAgent());

  const voiceAgentBtn = document.getElementById("voiceAgentBtn");
  if (voiceAgentBtn) voiceAgentBtn.addEventListener("click", () => toggleVoiceAgent());
});

// Format currency helper
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}

// Handle destination city input for suggestions
async function handleDestinationInput() {
  const destinationCity = document.getElementById("destinationCity").value;
  const destinationType = document.getElementById("destinationType").value;

  if (!destinationCity || !destinationType) {
    document.getElementById("accommodationSuggestion").textContent =
      "\u2713 Rate will be looked up automatically based on destination city";
    document.getElementById("accommodationSuggestion").style.color = "#666";
    document.getElementById("estimatedAccommodationPerNight").value = "";
    return;
  }

  const accommodationInput = document.getElementById(
    "estimatedAccommodationPerNight"
  );
  const suggestionText = document.getElementById("accommodationSuggestion");

  // Look up via the server API (JSON fallback inside)
  const rateData = await getAccommodationSuggestion(destinationCity);

  if (rateData) {
    // Get rate - use standardRate for international, first monthly rate for Canadian cities
    const rate = rateData.standardRate || (rateData.monthlyRates && rateData.monthlyRates[new Date().getMonth()]) || 100;
    accommodationInput.value = rate.toFixed(2);
    const currencySymbol = rateData.currency === "CAD" ? "$" : rateData.currency + " ";
    suggestionText.textContent = `\u2713 Found rate for ${rateData.name}: ${currencySymbol}${rate.toFixed(2)}/night`;
    suggestionText.style.color = "#2e7d32";
  } else {
    accommodationInput.value = "";
    suggestionText.textContent =
      "\u26A0\uFE0F No rate found. Please enter rate manually or check the city spelling.";
    suggestionText.style.color = "#ff9800";
  }
}

// Handle transport mode change
function handleTransportModeChange(e) {
  const transportMode = e.target.value;

  // Hide all transport-specific fields
  document.getElementById("flightOptionsGroup").style.display = "none";
  document.getElementById("vehicleOptionsGroup").style.display = "none";
  document.getElementById("flightCostGroup").style.display = "none";
  document.getElementById("trainCostGroup").style.display = "none";

  // Show/hide ground transport (relevant for flight & train, not personal vehicle)
  const groundGroup = document.getElementById("groundTransportGroup");
  if (transportMode === "flight" || transportMode === "train") {
    groundGroup.style.display = "block";
  } else {
    groundGroup.style.display = "none";
    // Reset ground transport when hidden
    document.getElementById("groundTransportType").value = "none";
    document.getElementById("groundTransportFields").style.display = "none";
  }

  // Clear required attributes
  document.getElementById("flightDuration").removeAttribute("required");
  document.getElementById("distanceKm").removeAttribute("required");
  document.getElementById("estimatedFlightCost").removeAttribute("required");
  document.getElementById("estimatedTrainCost").removeAttribute("required");

  // Show relevant fields based on selection
  if (transportMode === "flight") {
    document.getElementById("flightOptionsGroup").style.display = "block";
    document.getElementById("flightCostGroup").style.display = "block";
    document
      .getElementById("flightDuration")
      .setAttribute("required", "required");
    updateGoogleFlightsLink();
  } else if (transportMode === "vehicle") {
    document.getElementById("vehicleOptionsGroup").style.display = "block";
    document.getElementById("distanceKm").setAttribute("required", "required");
  } else if (transportMode === "train") {
    document.getElementById("trainCostGroup").style.display = "block";
  }
}

// Handle ground transport type change (show/hide cost fields)
function handleGroundTransportTypeChange(e) {
  const groundType = e.target.value;
  const fieldsDiv = document.getElementById("groundTransportFields");
  if (groundType === "none") {
    fieldsDiv.style.display = "none";
  } else {
    fieldsDiv.style.display = "block";
  }
}

// Update Google Flights link
function updateGoogleFlightsLink() {
  const departureCity = document.getElementById("departureCity").value;
  const destinationCity = document.getElementById("destinationCity").value;
  const departureDate = document.getElementById("departureDate").value;
  const returnDate = document.getElementById("returnDate").value;

  const link = document.getElementById("googleFlightsLink");

  if (departureCity && destinationCity) {
    // Create Google Flights URL
    let url = `https://www.google.com/travel/flights?q=flights`;

    if (departureDate && returnDate) {
      // Format: from CITY to CITY on DATE returning DATE
      url = `https://www.google.com/travel/flights?q=flights%20from%20${encodeURIComponent(
        departureCity
      )}%20to%20${encodeURIComponent(
        destinationCity
      )}%20on%20${departureDate}%20returning%20${returnDate}`;
    } else {
      url = `https://www.google.com/travel/flights?q=flights%20from%20${encodeURIComponent(
        departureCity
      )}%20to%20${encodeURIComponent(destinationCity)}`;
    }

    link.href = url;
    link.textContent = `Search Google Flights: ${departureCity} → ${destinationCity}`;
  } else {
    link.href = "https://www.google.com/travel/flights";
    link.textContent = "Search Google Flights for current prices";
  }
}

function buildCitySuggestionPool() {
  if (!accommodationRatesDB) {
    citySuggestionPool = [];
    return;
  }

  const pool = new Set(
    baseCityListOptions.map((name) => name.trim()).filter(Boolean)
  );

  const addCityCollection = (collection) => {
    if (!collection) return;
    Object.values(collection).forEach((city) => {
      if (city?.name) {
        pool.add(city.name);
      }
    });
  };

  addCityCollection(accommodationRatesDB.cities);
  addCityCollection(accommodationRatesDB.internationalCities);

  citySuggestionPool = Array.from(pool).sort((a, b) => a.localeCompare(b));
}

// REMOVED - Old functions refreshCityDatalist and createCityOption - no longer needed

// Handle automatic flight search
async function handleFlightSearch() {
  const departureCity = document.getElementById("departureCity").value;
  const destinationCity = document.getElementById("destinationCity").value;
  const departureDate = document.getElementById("departureDate").value;
  const returnDate = document.getElementById("returnDate").value;

  const statusDiv = document.getElementById("flightSearchStatus");
  const resultsDiv = document.getElementById("flightResults");
  const searchBtn = document.getElementById("searchFlightsBtn");

  // Validate inputs
  if (!departureCity || !destinationCity) {
    showFlightStatus(
      "error",
      "⚠️ Please enter both departure and destination cities"
    );
    return;
  }

  if (!departureDate || !returnDate) {
    showFlightStatus(
      "error",
      "⚠️ Please select both departure and return dates"
    );
    return;
  }

  // Show loading state
  searchBtn.disabled = true;
  searchBtn.textContent = "🔄 Searching flights...";
  showFlightStatus("loading", "✈️ Searching for flights...");
  resultsDiv.style.display = "none";

  try {
    // Call flight search API
    const params = new URLSearchParams({
      origin: departureCity,
      destination: destinationCity,
      departureDate: departureDate,
      returnDate: returnDate,
    });

    const response = await fetch(`/api/flights/search?${params}`);
    const data = await response.json();

    if (!data.success) {
      showFlightStatus("error", `❌ ${data.message}`);
      searchBtn.disabled = false;
      searchBtn.textContent = "🔍 Search Flights Automatically";
      return;
    }

    // Display flight results
    displayFlightResults(data.flights);
    showFlightStatus(
      "success",
      `✅ Found ${data.flights.length} flight options`
    );
  } catch (error) {
    console.error("Flight search error:", error);
    showFlightStatus(
      "error",
      "❌ Error connecting to flight service. Check if API keys are configured."
    );
  }

  searchBtn.disabled = false;
  searchBtn.textContent = "🔍 Search Flights Again";
}

// Show flight search status message
function showFlightStatus(type, message) {
  const statusDiv = document.getElementById("flightSearchStatus");
  statusDiv.style.display = "block";
  statusDiv.textContent = message;

  if (type === "loading") {
    statusDiv.style.background = "#e3f2fd";
    statusDiv.style.color = "#1976d2";
    statusDiv.style.border = "1px solid #1976d2";
  } else if (type === "success") {
    statusDiv.style.background = "#e8f5e9";
    statusDiv.style.color = "#2e7d32";
    statusDiv.style.border = "1px solid #2e7d32";
  } else if (type === "error") {
    statusDiv.style.background = "#ffebee";
    statusDiv.style.color = "#c62828";
    statusDiv.style.border = "1px solid #c62828";
  }
}

// Display flight results
function displayFlightResults(flights) {
  const resultsDiv = document.getElementById("flightResults");

  // Inject hover styles (once)
  if (!document.getElementById("flight-hover-styles")) {
    const style = document.createElement("style");
    style.id = "flight-hover-styles";
    style.textContent = `
      .flight-card { transition: all 0.3s ease; }
      .flight-card:hover { background: #f8fafc !important; transform: translateX(4px); box-shadow: 0 8px 16px rgba(0,0,0,0.08); }
      .flight-card-cheapest:hover { background: linear-gradient(135deg, #e0f2fe, #cffafe) !important; }
      .select-flight-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(14, 165, 233, 0.4) !important; }
    `;
    document.head.appendChild(style);
  }

  let html = `
    <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 20px 24px; border-radius: 12px 12px 0 0; border-bottom: 3px solid #0ea5e9;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 1.5em;">✈️</span>
          <strong style="font-size: 1.125rem; color: white;">Available Flights</strong>
        </div>
        <span style="background: #0ea5e9; color: white; padding: 6px 14px; border-radius: 999px; font-size: 0.875rem; font-weight: 600;">
          ${flights.length} option${flights.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  `;

  flights.forEach((flight, index) => {
    const isBusinessClass = flight.businessClassEligible;
    const longestLeg = flight.longestLegHours || flight.durationHours;
    const isCheapest = index === 0;
    const badge = isBusinessClass
      ? `<span style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);">⭐ Business Eligible (longest leg ${longestLeg}h)</span>`
      : "";
    const cheapestBadge = isCheapest
      ? '<span style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">💰 Best Price</span>'
      : "";

    html += `
      <div style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: ${isCheapest ? "linear-gradient(135deg, #f0f9ff, #e0f2fe)" : "white"
      }; transition: all 0.3s ease;" 
           id="flight-${index}"
           class="flight-card ${isCheapest ? 'flight-card-cheapest' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <strong style="font-size: 1.5rem; color: #0ea5e9; font-weight: 700;">$${flight.price.toFixed(
        2
      )}</strong>
              <span style="color: #475569; font-size: 0.875rem; font-weight: 500;">CAD</span>
              ${cheapestBadge}
              ${badge}
            </div>
            <div style="display: flex; align-items: center; gap: 16px; color: #475569; font-size: 0.875rem;">
              <span style="display: flex; align-items: center; gap: 6px;">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                </svg>
                <strong>${flight.durationHours}h</strong>
              </span>
              <span style="height: 16px; width: 1px; background: #cbd5e1;"></span>
              <span style="display: flex; align-items: center; gap: 6px;">
                ${flight.stops === 0
        ? '<svg width="16" height="16" fill="#10b981" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg>'
        : '<svg width="16" height="16" fill="#f59e0b" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
      }
                <strong>${flight.stops === 0
        ? "Direct Flight"
        : flight.stops + " stop" + (flight.stops > 1 ? "s" : "")
      }</strong>
              </span>
              <span style="height: 16px; width: 1px; background: #cbd5e1;"></span>
              <span style="color: #64748b; font-size: 0.8125rem;">${flight.carrier || "Various"
      }</span>
            </div>
            ${flight.layovers && flight.layovers.length > 0 ? `
            <div style="margin-top: 10px; padding: 10px 14px; background: #f8fafc; border-left: 3px solid #f59e0b; border-radius: 0 6px 6px 0;">
              <div style="font-size: 0.8125rem; color: #64748b; margin-bottom: 6px; font-weight: 600;">🛬 Layover Details</div>
              ${flight.layovers.map((lo, li) => {
                const hrs = Math.floor(lo.layoverMinutes / 60);
                const mins = lo.layoverMinutes % 60;
                const timeStr = hrs > 0 ? hrs + 'h ' + (mins > 0 ? mins + 'm' : '') : mins + 'm';
                const longLayover = lo.layoverMinutes >= 240;
                return `<div style="display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: #334155; ${li > 0 ? 'margin-top: 4px;' : ''}">
                  <span style="color: #f59e0b;">●</span>
                  <strong>${lo.city}</strong> (${lo.airport})
                  <span style="color: #94a3b8;">—</span>
                  <span style="${longLayover ? 'color: #dc2626; font-weight: 600;' : 'color: #475569;'}">${timeStr.trim()}${longLayover ? ' ⚠️' : ''}</span>
                </div>`;
              }).join('')}
            </div>` : ''}
          </div>
          <button type="button" 
                  class="select-flight-btn"
                  data-price="${flight.price}" 
                  data-duration="${flight.durationHours}" 
                  data-longest-leg="${flight.longestLegHours || flight.durationHours}"
                  data-business="${isBusinessClass}"
                  data-stops="${flight.stops}"
                  data-carrier="${flight.carrier || 'Various'}"
                  data-layovers="${flight.layovers ? encodeURIComponent(JSON.stringify(flight.layovers)) : ''}"
                  style="padding: 12px 24px; background: linear-gradient(135deg, #0ea5e9, #06b6d4); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9375rem; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3); transition: all 0.3s ease; white-space: nowrap;">>
            Select Flight →
          </button>
        </div>
      </div>
    `;
  });

  html += "</div>";
  resultsDiv.innerHTML = html;
  resultsDiv.style.display = "block";

  // Add click event listeners to all select buttons
  setTimeout(() => {
    const buttons = document.querySelectorAll(".select-flight-btn");
    console.log("Found buttons:", buttons.length);
    buttons.forEach((btn, index) => {
      console.log(`Setting up button ${index}:`, btn.dataset);
      btn.addEventListener("click", function (e) {
        console.log("Button clicked!", {
          price: this.dataset.price,
          duration: this.dataset.duration,
          business: this.dataset.business,
        });
        e.preventDefault();
        e.stopPropagation();
        const price = parseFloat(this.dataset.price);
        const duration = parseFloat(this.dataset.duration);
        const longestLeg = parseFloat(this.dataset.longestLeg) || duration;
        const business = this.dataset.business === "true";
        const stops = parseInt(this.dataset.stops) || 0;
        const carrier = this.dataset.carrier || "Various";
        let layovers = [];
        try {
          if (this.dataset.layovers) {
            layovers = JSON.parse(decodeURIComponent(this.dataset.layovers));
          }
        } catch (e) { layovers = []; }
        selectFlight(price, duration, business, stops, carrier, layovers, longestLeg);
      });
    });
  }, 0);
}

// Select a flight and populate form
function selectFlight(price, durationHours, businessClassEligible, stops, carrier, layovers, longestLegHours) {
  longestLegHours = longestLegHours || durationHours;
  console.log("selectFlight called with:", {
    price,
    durationHours,
    longestLegHours,
    businessClassEligible,
    stops,
    carrier,
    layovers,
  });
  // Set hidden form fields — use longestLegHours for business class determination
  document.getElementById("flightDuration").value = longestLegHours;
  document.getElementById("estimatedFlightCost").value = price;

  // Show selected flight info
  const selectedInfoDiv = document.getElementById("selectedFlightInfo");
  const selectedDetailsP = document.getElementById("selectedFlightDetails");

  let details = `<strong>Price:</strong> $${price.toFixed(
    2
  )} CAD | <strong>Duration:</strong> ${durationHours} hours | <strong>Carrier:</strong> ${carrier || "Various"}`;
  if (businessClassEligible) {
    details += ` | <strong style="color: #ff9800;">⚠️ Business class eligible (longest leg ${longestLegHours}h ≥ 9 hours)</strong>`;
  }

  // Add stop/layover summary
  if (stops === 0) {
    details += ` | <strong style="color: #10b981;">✈️ Direct Flight</strong>`;
  } else {
    details += ` | <strong>${stops} stop${stops > 1 ? "s" : ""}</strong>`;
  }

  // Add layover details
  if (layovers && layovers.length > 0) {
    details += `<div style="margin-top: 8px; padding: 8px 12px; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 6px 6px 0; font-size: 0.875rem;">`;
    details += `<strong style="color: #92400e;">🛬 Layovers:</strong> `;
    const layoverParts = layovers.map(lo => {
      const hrs = Math.floor(lo.layoverMinutes / 60);
      const mins = lo.layoverMinutes % 60;
      const timeStr = hrs > 0 ? hrs + 'h ' + (mins > 0 ? mins + 'm' : '') : mins + 'm';
      return `${lo.city} (${lo.airport}) — ${timeStr.trim()}`;
    });
    details += layoverParts.join(' → ');
    details += `</div>`;
  }

  selectedDetailsP.innerHTML = details;
  selectedInfoDiv.style.display = "block";

  // Hide flight results
  document.getElementById("flightResults").style.display = "none";

  // Show success message
  showFlightStatus(
    "success",
    "✅ Flight selected! Scroll down to calculate total trip cost."
  );

  // Smooth scroll to accommodation section
  setTimeout(() => {
    document
      .getElementById("estimatedAccommodationPerNight")
      .scrollIntoView({ behavior: "smooth", block: "center" });
  }, 500);
}

// ============ EXPORT FUNCTIONS ============

let currentEstimateData = null;

function exportCurrentEstimate() {
  if (!currentEstimateData) {
    alert("Please calculate an estimate first");
    return;
  }

  exportToCSV(currentEstimateData);
}

function printEstimate() {
  window.print();
}

// Store estimate data when calculation is complete
function storeEstimateData(data) {
  currentEstimateData = data;

  // Also save to trip history
  if (window.tripHistory) {
    window.tripHistory.save(data);
  }
}

// ===============================================
// CITY VALIDATION LISTENERS - Attach Immediately
// ===============================================
console.log("🚀 Attaching city validation listeners (immediate)...");

function attachCityValidationListeners() {
  const departureCityInput = document.getElementById("departureCity");
  const destinationCityInput = document.getElementById("destinationCity");

  console.log("📍 Found elements - departureCityInput:", departureCityInput);
  console.log(
    "📍 Found elements - destinationCityInput:",
    destinationCityInput
  );

  if (departureCityInput && destinationCityInput) {
    // Initialize validity to false
    departureCityInput.dataset.valid = "false";
    destinationCityInput.dataset.valid = "false";

    // Validate on blur
    departureCityInput.addEventListener("blur", () => {
      console.log("🔵 BLUR: Departure City");
      validateCity("departureCity");
    });
    destinationCityInput.addEventListener("blur", () => {
      console.log("🔵 BLUR: Destination City");
      validateCity("destinationCity");
    });

    // Validate on change
    departureCityInput.addEventListener("change", () => {
      console.log("🟢 CHANGE: Departure City");
      validateCity("departureCity");
    });
    destinationCityInput.addEventListener("change", () => {
      console.log("🟢 CHANGE: Destination City");
      validateCity("destinationCity");
    });

    console.log("✅ CITY VALIDATION LISTENERS ATTACHED SUCCESS");
  } else {
    console.error("❌ FAILED TO FIND CITY INPUT ELEMENTS");
    if (!departureCityInput) console.error("   - Missing: departureCity input");
    if (!destinationCityInput)
      console.error("   - Missing: destinationCity input");
  }
}

// Attach immediately (don't wait for DOMContentLoaded)
attachCityValidationListeners();

// Also attach on DOMContentLoaded as backup
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attachCityValidationListeners);
} else {
  console.log(
    "ℹ️ DOMContentLoaded already fired, listeners attached immediately above"
  );
}
