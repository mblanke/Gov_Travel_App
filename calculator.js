// Travel Cost Calculator Module
// Main calculation engine for government travel costs

// Calculate number of days between two dates
function calculateDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Calculate number of nights
function calculateNights(startDate, endDate) {
    const days = calculateDays(startDate, endDate);
    return Math.max(0, days);
}

// Calculate total travel costs
async function calculateTravelCosts(params) {
    const {
        departureCity,
        destinationCity,
        departureDate,
        returnDate,
        currency,
        privateAccommodation,
        privateAccommodationRate,
        searchFlights
    } = params;
    
    // Validate inputs
    if (!departureCity || !destinationCity || !departureDate || !returnDate) {
        throw new Error('Missing required travel information');
    }
    
    // Get city details
    const departureCityDetails = getCityDetails(departureCity);
    const destinationCityDetails = getCityDetails(destinationCity);
    
    if (!departureCityDetails) {
        throw new Error(`Invalid departure city: ${departureCity}`);
    }
    if (!destinationCityDetails) {
        throw new Error(`Invalid destination city: ${destinationCity}`);
    }
    
    // Calculate days and nights
    const travelDays = calculateDays(departureDate, returnDate) + 1; // Include both start and end days
    const nights = calculateNights(departureDate, returnDate);
    
    // Get NJC rates for destination
    const rates = getCityRates(destinationCity);
    
    // Calculate per diem (meals and incidentals)
    const perDiemTotal = calculatePerDiem(destinationCity, travelDays);
    const mealBreakdown = getMealBreakdown(destinationCity);
    
    // Calculate accommodation
    const accommodationTotal = calculateAccommodation(
        destinationCity,
        nights,
        privateAccommodation,
        privateAccommodationRate
    );
    
    // Flight information
    let flightInfo = null;
    let flightCost = 0;
    
    if (searchFlights) {
        flightInfo = await window.searchFlights(
            departureCity,
            destinationCity,
            departureDate,
            returnDate,
            departureCityDetails,
            destinationCityDetails
        );
        
        // Use economy cost by default, business if eligible
        flightCost = flightInfo.businessClassEligible 
            ? flightInfo.pricing.business 
            : flightInfo.pricing.economy;
    }
    
    // Calculate subtotal in CAD
    const subtotalCAD = perDiemTotal + accommodationTotal + flightCost;
    
    // Convert to selected currency if needed
    let totalInSelectedCurrency = subtotalCAD;
    let conversionInfo = null;
    
    if (currency !== 'CAD') {
        totalInSelectedCurrency = convertCurrency(subtotalCAD, 'CAD', currency);
        conversionInfo = getConversionDetails(subtotalCAD, 'CAD', currency);
    }
    
    // Build result object
    return {
        tripDetails: {
            departure: {
                city: departureCity,
                province: departureCityDetails.province,
                date: departureDate
            },
            destination: {
                city: destinationCity,
                province: destinationCityDetails.province,
                date: returnDate
            },
            duration: {
                days: travelDays,
                nights: nights
            }
        },
        costs: {
            perDiem: {
                total: perDiemTotal,
                dailyRate: rates.perDiem,
                breakdown: mealBreakdown,
                currency: 'CAD'
            },
            accommodation: {
                total: accommodationTotal,
                nightlyRate: privateAccommodation 
                    ? (privateAccommodationRate || PRIVATE_ACCOMMODATION_RATE)
                    : rates.accommodation,
                nights: nights,
                type: privateAccommodation ? 'Private' : 'Commercial',
                currency: 'CAD'
            },
            flights: flightInfo ? {
                total: flightCost,
                details: flightInfo,
                currency: 'CAD'
            } : null
        },
        totals: {
            cadTotal: subtotalCAD,
            selectedCurrency: currency,
            selectedCurrencyTotal: totalInSelectedCurrency,
            conversion: conversionInfo
        },
        rates: rates,
        timestamp: new Date().toISOString()
    };
}

// Format calculation results for display
function formatResults(results) {
    const { tripDetails, costs, totals } = results;
    
    let html = '';
    
    // Trip summary
    html += '<div class="info-box">';
    html += `<strong>Trip:</strong> ${tripDetails.departure.city}, ${tripDetails.departure.province} → `;
    html += `${tripDetails.destination.city}, ${tripDetails.destination.province}<br>`;
    html += `<strong>Duration:</strong> ${tripDetails.duration.days} days, ${tripDetails.duration.nights} nights<br>`;
    html += `<strong>Dates:</strong> ${tripDetails.departure.date} to ${tripDetails.destination.date}`;
    html += '</div>';
    
    return html;
}

// Validate travel dates
function validateDates(departureDate, returnDate) {
    const departure = new Date(departureDate);
    const returnD = new Date(returnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (departure < today) {
        return { valid: false, error: 'Departure date cannot be in the past' };
    }
    
    if (returnD < departure) {
        return { valid: false, error: 'Return date must be after departure date' };
    }
    
    const maxDays = 365;
    const daysDiff = calculateDays(departureDate, returnDate);
    if (daysDiff > maxDays) {
        return { valid: false, error: `Travel duration cannot exceed ${maxDays} days` };
    }
    
    return { valid: true };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateTravelCosts,
        calculateDays,
        calculateNights,
        formatResults,
        validateDates
    };
}
