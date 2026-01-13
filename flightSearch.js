// Flight Search Module - Amadeus API Integration
// Real-time flight search and business class eligibility

// Configuration for Amadeus API
const AMADEUS_CONFIG = {
    // These should be set in a separate config.js file or environment variables
    apiKey: null,
    apiSecret: null,
    endpoint: 'https://test.api.amadeus.com/v2'
};

// Business class eligibility threshold (9+ hours)
const BUSINESS_CLASS_THRESHOLD_HOURS = 9;

// Estimated flight durations between major Canadian cities (in hours)
const ESTIMATED_FLIGHT_DURATIONS = {
    // Format: "CityA-CityB": hours
    "Vancouver-Toronto": 4.5,
    "Toronto-Vancouver": 5.0,
    "Calgary-Toronto": 4.0,
    "Toronto-Calgary": 4.5,
    "Montreal-Vancouver": 5.5,
    "Vancouver-Montreal": 6.0,
    "Halifax-Vancouver": 6.5,
    "Vancouver-Halifax": 7.0,
    "St. John's-Vancouver": 7.5,
    "Vancouver-St. John's": 8.0,
    "Yellowknife-Toronto": 5.5,
    "Toronto-Yellowknife": 6.0,
    "Iqaluit-Vancouver": 8.5,
    "Vancouver-Iqaluit": 9.5,
    "Whitehorse-Toronto": 6.5,
    "Toronto-Whitehorse": 7.0,
    "Halifax-Calgary": 5.5,
    "Calgary-Halifax": 6.0,
};

// Calculate flight duration estimate
function estimateFlightDuration(departureCity, destinationCity) {
    // Try direct lookup
    const key1 = `${departureCity}-${destinationCity}`;
    if (ESTIMATED_FLIGHT_DURATIONS[key1]) {
        return ESTIMATED_FLIGHT_DURATIONS[key1];
    }
    
    // Try reverse lookup
    const key2 = `${destinationCity}-${departureCity}`;
    if (ESTIMATED_FLIGHT_DURATIONS[key2]) {
        return ESTIMATED_FLIGHT_DURATIONS[key2];
    }
    
    // Estimate based on distance (rough approximation)
    // For demonstration purposes, we'll use a simple heuristic
    const eastCoastCities = ['Halifax', 'St. John\'s', 'Charlottetown', 'Moncton', 'Saint John', 'Fredericton'];
    const westCoastCities = ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond'];
    const northernCities = ['Yellowknife', 'Iqaluit', 'Whitehorse', 'Inuvik'];
    
    const isEastToWest = 
        (eastCoastCities.includes(departureCity) && westCoastCities.includes(destinationCity)) ||
        (westCoastCities.includes(departureCity) && eastCoastCities.includes(destinationCity));
    
    const involvesNorth = 
        northernCities.includes(departureCity) || northernCities.includes(destinationCity);
    
    if (isEastToWest) return 6.0; // Cross-country
    if (involvesNorth) return 5.5; // Northern routes
    
    return 3.5; // Default regional estimate
}

// Check if business class is eligible
function isBusinessClassEligible(flightDurationHours) {
    return flightDurationHours >= BUSINESS_CLASS_THRESHOLD_HOURS;
}

// Search flights (mock implementation - replace with actual Amadeus API calls)
async function searchFlights(departureCity, destinationCity, departureDate, returnDate, departureCityDetails, destinationCityDetails) {
    // Check if API is configured
    if (!AMADEUS_CONFIG.apiKey || !AMADEUS_CONFIG.apiSecret) {
        return createMockFlightResults(departureCity, destinationCity, departureDate, returnDate, departureCityDetails, destinationCityDetails);
    }
    
    try {
        // In production, this would make actual API calls to Amadeus
        // const token = await getAmadeusToken();
        // const flights = await fetchFlights(token, ...params);
        
        // For now, return mock data
        return createMockFlightResults(departureCity, destinationCity, departureDate, returnDate, departureCityDetails, destinationCityDetails);
    } catch (error) {
        console.error('Flight search error:', error);
        return createMockFlightResults(departureCity, destinationCity, departureDate, returnDate, departureCityDetails, destinationCityDetails);
    }
}

// Create mock flight results
function createMockFlightResults(departureCity, destinationCity, departureDate, returnDate, departureCityDetails, destinationCityDetails) {
    const duration = estimateFlightDuration(departureCity, destinationCity);
    const businessClassEligible = isBusinessClassEligible(duration);
    
    // Estimate flight costs (in CAD)
    const economyCost = 300 + (duration * 50);
    const businessCost = economyCost * 2.5;
    
    const departureCode = departureCityDetails?.code || 'XXX';
    const destinationCode = destinationCityDetails?.code || 'XXX';
    
    return {
        outbound: {
            departure: {
                city: departureCity,
                airport: departureCode,
                date: departureDate,
                time: '08:00'
            },
            arrival: {
                city: destinationCity,
                airport: destinationCode,
                date: departureDate,
                time: addHours('08:00', duration)
            },
            duration: duration,
            durationFormatted: formatDuration(duration),
            stops: duration > 5 ? 1 : 0
        },
        return: {
            departure: {
                city: destinationCity,
                airport: destinationCode,
                date: returnDate,
                time: '14:00'
            },
            arrival: {
                city: departureCity,
                airport: departureCode,
                date: returnDate,
                time: addHours('14:00', duration)
            },
            duration: duration,
            durationFormatted: formatDuration(duration),
            stops: duration > 5 ? 1 : 0
        },
        pricing: {
            economy: economyCost,
            business: businessCost,
            currency: 'CAD'
        },
        businessClassEligible: businessClassEligible,
        businessClassThreshold: BUSINESS_CLASS_THRESHOLD_HOURS,
        message: businessClassEligible 
            ? `✓ Business class eligible (flight duration ${formatDuration(duration)} exceeds ${BUSINESS_CLASS_THRESHOLD_HOURS} hours)`
            : `✗ Business class not eligible (flight duration ${formatDuration(duration)} is under ${BUSINESS_CLASS_THRESHOLD_HOURS} hours)`,
        note: 'Flight data is estimated. Enable Amadeus API for real-time availability and pricing.'
    };
}

// Helper: Format duration
function formatDuration(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
}

// Helper: Add hours to time string
function addHours(timeStr, hours) {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + (hours * 60);
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = Math.floor(totalMinutes % 60);
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

// Configure Amadeus API (call this with credentials)
function configureAmadeusAPI(apiKey, apiSecret) {
    AMADEUS_CONFIG.apiKey = apiKey;
    AMADEUS_CONFIG.apiSecret = apiSecret;
}

// Check if API is configured
function isAPIConfigured() {
    return !!(AMADEUS_CONFIG.apiKey && AMADEUS_CONFIG.apiSecret);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        searchFlights,
        estimateFlightDuration,
        isBusinessClassEligible,
        configureAmadeusAPI,
        isAPIConfigured,
        BUSINESS_CLASS_THRESHOLD_HOURS
    };
}
