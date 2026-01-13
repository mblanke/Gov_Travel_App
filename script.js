// ========================================
// SCRIPT INITIALIZATION - Verify Loading
// ========================================
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
    const [perDiemResponse, accommodationResponse, transportationResponse] =
      await Promise.all([
        fetch("data/perDiemRates.json"),
        fetch("data/accommodationRates.json"),
        fetch("data/transportationRates.json"),
      ]);

    if (
      !perDiemResponse.ok ||
      !accommodationResponse.ok ||
      !transportationResponse.ok
    ) {
      throw new Error("Failed to load rate databases");
    }

    perDiemRatesDB = await perDiemResponse.json();
    accommodationRatesDB = await accommodationResponse.json();
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
    const effectiveDate = new Date(perDiemRatesDB.metadata.effectiveDate);
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
    const effectiveDate = new Date(
      transportationRatesDB.metadata.effectiveDate
    );
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

  // Display warnings if any
  if (warnings.length > 0) {
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
    '<button onclick="dismissWarningBanner()" class="btn-dismiss">Dismiss</button>';
  content += "</div>";

  warningBanner.innerHTML = content;
  warningBanner.style.display = "block";
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
      breakfast: 29.05,
      lunch: 29.6,
      dinner: 60.75,
      incidental: 17.3,
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

// Helper function to get accommodation rate suggestion
function getAccommodationSuggestion(destinationCity, destinationType) {
  if (!accommodationRatesDB) return null;

  // Normalize city name to match database key format
  const normalizeCity = (city) => {
    return city
      .toLowerCase()
      .replace(/,.*$/, "") // Remove everything after comma
      .replace(/[^a-z\s]/g, "") // Remove special characters
      .trim()
      .replace(/\s+/g, ""); // Remove spaces
  };

  const cityKey = normalizeCity(destinationCity);

  // Check standard cities
  if (accommodationRatesDB.cities && accommodationRatesDB.cities[cityKey]) {
    return accommodationRatesDB.cities[cityKey];
  }

  // Check international cities
  if (
    accommodationRatesDB.internationalCities &&
    accommodationRatesDB.internationalCities[cityKey]
  ) {
    return accommodationRatesDB.internationalCities[cityKey];
  }

  // Return default for region
  if (
    accommodationRatesDB.defaults &&
    accommodationRatesDB.defaults[destinationType]
  ) {
    return {
      name: destinationCity,
      ...accommodationRatesDB.defaults[destinationType],
      isDefault: true,
    };
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

  // Auto-lookup accommodation rate if not already populated
  let destinationRegion = destinationType; // Start with user-selected type
  if (!accommodationPerNight && !privateAccommodation) {
    try {
      const response = await fetch(
        `/api/accommodation/rate?city=${encodeURIComponent(destinationCity)}`
      );
      const rateData = await response.json();

      if (
        rateData &&
        !rateData.error &&
        (rateData.accommodation || rateData.name)
      ) {
        accommodationPerNight =
          rateData.accommodation?.standard ||
          rateData.accommodation?.monthly?.[0] ||
          100;
        destinationRegion = normalizeRegion(rateData.region || destinationType);

        // Use city-specific allowances when provided by DB
        if (rateData.meals) {
          customAllowances = {
            breakfast: rateData.meals.breakfast,
            lunch: rateData.meals.lunch,
            dinner: rateData.meals.dinner,
            incidental: rateData.incidentals,
            currency: rateData.currency,
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
    } catch (error) {
      console.error("Error fetching accommodation rate:", error);
      alert("Error connecting to server. Please try again.");
      return;
    }
  } else if (accommodationPerNight) {
    // If accommodation is already populated, still try to detect the region for per diem rates
    try {
      const response = await fetch(
        `/api/accommodation/rate?city=${encodeURIComponent(destinationCity)}`
      );
      const rateData = await response.json();
      if (rateData && rateData.region) {
        destinationRegion = normalizeRegion(rateData.region);

        if (rateData.meals) {
          customAllowances = {
            breakfast: rateData.meals.breakfast,
            lunch: rateData.meals.lunch,
            dinner: rateData.meals.dinner,
            incidental: rateData.incidentals,
            currency: rateData.currency,
            privateAccommodation: 50.0,
          };
        }
      }
    } catch (error) {
      console.warn("Could not fetch region data:", error);
      // Continue with user-selected type
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
    },
    customAllowances // PASS the city-specific allowances here!
  );

  // Display results
  displayResults(costs, {
    departureCity,
    destinationCity,
    numberOfDays,
    numberOfNights,
    transportMode,
    flightDuration,
    distanceKm,
    privateAccommodation,
  });
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
  } = params;

  // Use city-specific allowances if provided; otherwise fall back to region defaults
  const allowances =
    customAllowances || getAllowancesForRegion(destinationType);

  // Calculate transportation cost
  let transportCost = 0;
  let transportNote = "";
  let transportLabel = "🚗 Transportation";

  if (transportMode === "flight") {
    transportLabel = "✈️ Flight Cost";
    if (flightDuration >= BUSINESS_CLASS_THRESHOLD_HOURS) {
      transportCost = estimatedTransportCost * BUSINESS_CLASS_MULTIPLIER;
      transportNote = `Business class applicable (flight ${flightDuration} hours ≥ 9 hours). Estimated at ${BUSINESS_CLASS_MULTIPLIER}x economy cost per NJC Directive Section 3.3.11/3.4.11`;
    }
  } else if (transportMode === "vehicle") {
    transportLabel = "🚗 Personal Vehicle";
    const kmRate = transportationRatesDB
      ? transportationRatesDB.kilometricRates.modules.module3.rates.tier1.perKm
      : 0.68;
    transportCost = distanceKm * kmRate;
    transportNote = `Kilometric rate: $${kmRate.toFixed(
      2
    )}/km × ${distanceKm} km. Rate from NJC Appendix B. Parking and tolls may be additional.`;
  } else if (transportMode === "train") {
    transportLabel = "🚂 Train Cost";
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

  // Calculate total
  const totalCost =
    transportCost + accommodationCost + mealsCost + incidentalsCost;

  return {
    transportCost,
    transportNote,
    transportLabel,
    accommodationCost,
    accommodationNote,
    mealsCost,
    mealsNote,
    incidentalsCost,
    incidentalsNote,
    totalCost,
    currency: allowances.currency || "CAD",
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
  const showCADConversion = currencyLabel !== "CAD";

  totalCostEl.textContent = formatCurrencyAmount(
    costs.totalCost,
    currencyLabel,
    showCADConversion
  );
  transportLabelEl.textContent = costs.transportLabel;
  transportCostEl.textContent = formatCurrencyAmount(
    costs.transportCost,
    currencyLabel,
    showCADConversion
  );
  transportNoteEl.textContent = costs.transportNote;
  accommodationCostEl.textContent = formatCurrencyAmount(
    costs.accommodationCost,
    currencyLabel,
    showCADConversion
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

  console.log(`validateCity called for ${inputId}, city: "${city}"`);

  if (!city) {
    status.style.display = "none";
    input.style.borderColor = "";
    return;
  }

  try {
    const url = `/api/accommodation/rate?city=${encodeURIComponent(city)}`;
    console.log(`Fetching: ${url}`);
    const response = await fetch(url);
    const data = await response.json();
    console.log(`API response:`, data);

    if (data && !data.error && data.name) {
      // Valid city
      console.log(`✅ Valid city: ${data.name}`);
      status.textContent = `✅ ${data.name} found`;
      status.style.color = "#2e7d32";
      status.style.display = "block";
      input.style.borderColor = "#2e7d32";
      input.dataset.valid = "true";
    } else {
      // Invalid city
      console.log(`❌ Invalid city`);
      status.textContent = `❌ City not found. Check spelling or try a nearby major city`;
      status.style.color = "#c62828";
      status.style.display = "block";
      input.style.borderColor = "#c62828";
      input.dataset.valid = "false";
    }
  } catch (error) {
    console.error("Validation error:", error);
    status.style.display = "none";
  }
}

// Simplified city suggestions function - called directly from HTML oninput
async function showCitySuggestions(query, suggestionsId, inputId) {
  console.log(`showCitySuggestions: query="${query}", div="${suggestionsId}"`);

  const suggestionsDiv = document.getElementById(suggestionsId);
  if (!suggestionsDiv) {
    console.error(`Suggestions div not found: ${suggestionsId}`);
    return;
  }

  // Hide if query is too short
  if (!query || query.length < 2) {
    suggestionsDiv.style.display = "none";
    return;
  }

  // Show loading
  suggestionsDiv.innerHTML =
    '<div class="city-suggestion-item">Loading...</div>';
  suggestionsDiv.style.display = "block";

  try {
    const response = await fetch(
      `/api/autocomplete?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    console.log("API response:", data);

    if (!data.suggestions || data.suggestions.length === 0) {
      suggestionsDiv.innerHTML =
        '<div class="city-suggestion-item">No cities found</div>';
      return;
    }

    // Format city names
    const cities = data.suggestions.map((city) => {
      if (city.country === "Canada") {
        return `${city.city_name}, ${city.province_state}`;
      } else {
        return `${city.city_name}, ${city.country}`;
      }
    });

    // Build HTML for suggestions
    suggestionsDiv.innerHTML = cities
      .slice(0, 10)
      .map(
        (city) =>
          `<div class="city-suggestion-item" onclick="selectCity('${city.replace(
            /'/g,
            "\\'"
          )}', '${inputId}')">${city}</div>`
      )
      .join("");

    suggestionsDiv.style.display = "block";
  } catch (error) {
    console.error("Error:", error);
    suggestionsDiv.innerHTML =
      '<div class="city-suggestion-item">Error loading cities</div>';
  }
}

// Select a city and populate the input
function selectCity(cityName, inputId) {
  console.log(`Selecting city: ${cityName} for input: ${inputId}`);
  document.getElementById(inputId).value = cityName;

  // Hide suggestions
  const suggestionsId =
    inputId === "departureCity"
      ? "departureCitySuggestions"
      : "destinationCitySuggestions";
  document.getElementById(suggestionsId).style.display = "none";

  // Trigger change event for destination city
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

// Load cities from database API
async function loadCitiesFromAPI() {
  try {
    const response = await fetch("/api/search?q=");
    const data = await response.json();

    if (data && data.results) {
      // Extract city names from results
      ALL_CITIES = data.results
        .map((city) => {
          if (city.country === "Canada") {
            return `${city.city_name}, ${city.province_state}`;
          } else {
            return `${city.city_name}, ${city.country}`;
          }
        })
        .sort((a, b) => a.localeCompare(b));

      console.log(`Loaded ${ALL_CITIES.length} cities from database`);
    }
  } catch (error) {
    console.error("Error loading cities from API:", error);
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

  // Handle destination input
  document
    .getElementById("destinationCity")
    .addEventListener("input", handleDestinationInput);

  document
    .getElementById("destinationType")
    .addEventListener("change", handleDestinationInput);

  // Handle transport mode change
  document
    .getElementById("transportMode")
    .addEventListener("change", handleTransportModeChange);

  // Handle automatic flight search
  document
    .getElementById("searchFlightsBtn")
    .addEventListener("click", handleFlightSearch);

  // Handle departure/destination for Google Flights link
  document
    .getElementById("departureCity")
    .addEventListener("input", updateGoogleFlightsLink);
  document
    .getElementById("destinationCity")
    .addEventListener("input", updateGoogleFlightsLink);
  document
    .getElementById("departureDate")
    .addEventListener("change", updateGoogleFlightsLink);
  document
    .getElementById("returnDate")
    .addEventListener("change", updateGoogleFlightsLink);

  // City validation listeners moved outside DOMContentLoaded to avoid timing issues
});

// Format currency helper
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}

// Handle destination city input for suggestions
async function handleDestinationInput(e) {
  const destinationCity = document.getElementById("destinationCity").value;
  const destinationType = document.getElementById("destinationType").value;

  if (!destinationCity || !destinationType) {
    document.getElementById("accommodationSuggestion").textContent =
      "✓ Rate will be looked up automatically based on destination city";
    document.getElementById("accommodationSuggestion").style.color = "#666";
    document.getElementById("estimatedAccommodationPerNight").value = "";
    return;
  }

  const accommodationInput = document.getElementById(
    "estimatedAccommodationPerNight"
  );
  const suggestionText = document.getElementById("accommodationSuggestion");

  // Fetch from API
  try {
    const response = await fetch(
      `/api/accommodation/rate?city=${encodeURIComponent(destinationCity)}`
    );
    const rateData = await response.json();

    if (rateData && !rateData.error && rateData.accommodation_rate) {
      accommodationInput.value = rateData.accommodation_rate.toFixed(2);
      suggestionText.textContent = `✓ Found rate for ${
        rateData.city_name
      }: $${rateData.accommodation_rate.toFixed(2)}/night`;
      suggestionText.style.color = "#2e7d32";
    } else {
      accommodationInput.value = "";
      suggestionText.textContent =
        "⚠️ No rate found for this city. Rate will be looked up on submit.";
      suggestionText.style.color = "#ff9800";
    }
  } catch (error) {
    console.error("Error fetching accommodation rate:", error);
    accommodationInput.value = "";
    suggestionText.textContent =
      "⚠️ Error fetching rate. Rate will be looked up on submit.";
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
    const isCheapest = index === 0;
    const badge = isBusinessClass
      ? '<span style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);">⭐ Business Eligible</span>'
      : "";
    const cheapestBadge = isCheapest
      ? '<span style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">💰 Best Price</span>'
      : "";

    html += `
      <div style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: ${
        isCheapest ? "linear-gradient(135deg, #f0f9ff, #e0f2fe)" : "white"
      }; transition: all 0.3s ease;" 
           id="flight-${index}"
           onmouseover="this.style.background='${
             isCheapest
               ? "linear-gradient(135deg, #e0f2fe, #cffafe)"
               : "#f8fafc"
           }'; this.style.transform='translateX(4px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.08)'"
           onmouseout="this.style.background='${
             isCheapest ? "linear-gradient(135deg, #f0f9ff, #e0f2fe)" : "white"
           }'; this.style.transform='translateX(0)'; this.style.boxShadow='none'">
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
                ${
                  flight.stops === 0
                    ? '<svg width="16" height="16" fill="#10b981" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg>'
                    : '<svg width="16" height="16" fill="#f59e0b" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
                }
                <strong>${
                  flight.stops === 0
                    ? "Direct Flight"
                    : flight.stops + " stop" + (flight.stops > 1 ? "s" : "")
                }</strong>
              </span>
              <span style="height: 16px; width: 1px; background: #cbd5e1;"></span>
              <span style="color: #64748b; font-size: 0.8125rem;">${
                flight.carrier || "Various"
              }</span>
            </div>
          </div>
          <button type="button" 
                  class="select-flight-btn"
                  data-price="${flight.price}" 
                  data-duration="${flight.durationHours}" 
                  data-business="${isBusinessClass}"
                  style="padding: 12px 24px; background: linear-gradient(135deg, #0ea5e9, #06b6d4); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9375rem; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3); transition: all 0.3s ease; white-space: nowrap;"
                  onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(14, 165, 233, 0.4)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(14, 165, 233, 0.3)'">
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
        const business = this.dataset.business === "true";
        selectFlight(price, duration, business);
      });
    });
  }, 0);
}

// Select a flight and populate form
function selectFlight(price, durationHours, businessClassEligible) {
  console.log("selectFlight called with:", {
    price,
    durationHours,
    businessClassEligible,
  });
  // Set hidden form fields
  document.getElementById("flightDuration").value = durationHours;
  document.getElementById("estimatedFlightCost").value = price;

  // Show selected flight info
  const selectedInfoDiv = document.getElementById("selectedFlightInfo");
  const selectedDetailsP = document.getElementById("selectedFlightDetails");

  let details = `<strong>Price:</strong> $${price.toFixed(
    2
  )} CAD | <strong>Duration:</strong> ${durationHours} hours`;
  if (businessClassEligible) {
    details += ` | <strong style="color: #ff9800;">⚠️ Business class eligible (≥9 hours)</strong>`;
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
