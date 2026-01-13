// Main Application Script
// Handles UI interactions and form submission

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Populate city datalist
    populateCityList();
    
    // Set up form event listeners
    setupFormListeners();
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('departureDate').setAttribute('min', today);
    document.getElementById('returnDate').setAttribute('min', today);
    
    console.log('Government Travel Cost Estimator initialized');
    console.log(`Loaded ${CITIES.length} cities`);
}

function populateCityList() {
    const datalist = document.getElementById('cityList');
    CITIES.forEach(city => {
        const option = document.createElement('option');
        option.value = city.name;
        option.textContent = `${city.name}, ${city.province}`;
        datalist.appendChild(option);
    });
}

function setupFormListeners() {
    const form = document.getElementById('travelForm');
    const privateAccomCheckbox = document.getElementById('privateAccommodation');
    const departureCityInput = document.getElementById('departureCity');
    const destinationCityInput = document.getElementById('destinationCity');
    const departureDateInput = document.getElementById('departureDate');
    const returnDateInput = document.getElementById('returnDate');
    
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // Private accommodation toggle
    privateAccomCheckbox.addEventListener('change', function() {
        const details = document.getElementById('privateAccommodationDetails');
        details.style.display = this.checked ? 'block' : 'none';
    });
    
    // City validation
    departureCityInput.addEventListener('blur', function() {
        validateCityInput(this, 'departureCityError');
    });
    
    destinationCityInput.addEventListener('blur', function() {
        validateCityInput(this, 'destinationCityError');
    });
    
    // Date validation
    departureDateInput.addEventListener('change', function() {
        if (returnDateInput.value) {
            validateDateRange();
        }
    });
    
    returnDateInput.addEventListener('change', function() {
        if (departureDateInput.value) {
            validateDateRange();
        }
    });
}

function validateCityInput(input, errorId) {
    const errorSpan = document.getElementById(errorId);
    const cityName = input.value.trim();
    
    if (!cityName) {
        errorSpan.textContent = '';
        return true;
    }
    
    if (!validateCity(cityName)) {
        errorSpan.textContent = `"${cityName}" is not in our database. Please select a valid Canadian city.`;
        input.setCustomValidity('Invalid city');
        return false;
    }
    
    errorSpan.textContent = '';
    input.setCustomValidity('');
    return true;
}

function validateDateRange() {
    const departureDateInput = document.getElementById('departureDate');
    const returnDateInput = document.getElementById('returnDate');
    
    const validation = validateDates(departureDateInput.value, returnDateInput.value);
    
    if (!validation.valid) {
        returnDateInput.setCustomValidity(validation.error);
        alert(validation.error);
        return false;
    }
    
    returnDateInput.setCustomValidity('');
    return true;
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Clear previous results and errors
    document.getElementById('results').style.display = 'none';
    document.getElementById('error').style.display = 'none';
    
    // Get form values
    const departureCity = document.getElementById('departureCity').value.trim();
    const destinationCity = document.getElementById('destinationCity').value.trim();
    const departureDate = document.getElementById('departureDate').value;
    const returnDate = document.getElementById('returnDate').value;
    const currency = document.getElementById('currency').value;
    const privateAccommodation = document.getElementById('privateAccommodation').checked;
    const privateAccommodationRate = parseFloat(document.getElementById('privateAccommodationRate').value) || null;
    const searchFlightsOption = document.getElementById('searchFlights').checked;
    
    // Validate cities
    if (!validateCityInput(document.getElementById('departureCity'), 'departureCityError') ||
        !validateCityInput(document.getElementById('destinationCity'), 'destinationCityError')) {
        return;
    }
    
    // Validate dates
    if (!validateDateRange()) {
        return;
    }
    
    try {
        // Show loading state
        showLoading();
        
        // Calculate costs
        const results = await calculateTravelCosts({
            departureCity,
            destinationCity,
            departureDate,
            returnDate,
            currency,
            privateAccommodation,
            privateAccommodationRate,
            searchFlights: searchFlightsOption
        });
        
        // Display results
        displayResults(results);
        
        // Store results for export
        window.lastCalculation = results;
        
    } catch (error) {
        console.error('Calculation error:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function showLoading() {
    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Calculating...';
}

function hideLoading() {
    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Calculate Travel Costs';
}

function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    const { tripDetails, costs, totals } = results;
    
    // Accommodation section
    const accommodationDetails = document.getElementById('accommodationDetails');
    accommodationDetails.innerHTML = `
        <div class="result-item">
            <span class="result-label">Type:</span>
            <span class="result-value">${costs.accommodation.type} Accommodation</span>
        </div>
        <div class="result-item">
            <span class="result-label">Nightly Rate:</span>
            <span class="result-value">${formatCurrency(costs.accommodation.nightlyRate, 'CAD')}</span>
        </div>
        <div class="result-item">
            <span class="result-label">Number of Nights:</span>
            <span class="result-value">${costs.accommodation.nights}</span>
        </div>
        <div class="result-item">
            <span class="result-label"><strong>Total Accommodation:</strong></span>
            <span class="result-value"><strong>${formatCurrency(costs.accommodation.total, 'CAD')}</strong></span>
        </div>
    `;
    
    // Per Diem section
    const perDiemDetails = document.getElementById('perDiemDetails');
    perDiemDetails.innerHTML = `
        <div class="result-item">
            <span class="result-label">Daily Per Diem Rate:</span>
            <span class="result-value">${formatCurrency(costs.perDiem.dailyRate, 'CAD')}</span>
        </div>
        <div class="result-item">
            <span class="result-label">Number of Days:</span>
            <span class="result-value">${tripDetails.duration.days}</span>
        </div>
        <div class="info-box" style="margin-top: 10px;">
            <strong>Daily Breakdown:</strong><br>
            Breakfast: ${formatCurrency(costs.perDiem.breakdown.breakfast, 'CAD')}<br>
            Lunch: ${formatCurrency(costs.perDiem.breakdown.lunch, 'CAD')}<br>
            Dinner: ${formatCurrency(costs.perDiem.breakdown.dinner, 'CAD')}<br>
            Incidentals: ${formatCurrency(costs.perDiem.breakdown.incidentals, 'CAD')}
        </div>
        <div class="result-item">
            <span class="result-label"><strong>Total Per Diem:</strong></span>
            <span class="result-value"><strong>${formatCurrency(costs.perDiem.total, 'CAD')}</strong></span>
        </div>
    `;
    
    // Flight information
    if (costs.flights) {
        const flightInfo = document.getElementById('flightInfo');
        const flightDetails = document.getElementById('flightDetails');
        flightInfo.style.display = 'block';
        
        const flight = costs.flights.details;
        
        flightDetails.innerHTML = `
            ${flight.businessClassEligible ? 
                '<div class="business-class-notice"><strong>✓ Business Class Eligible</strong><br>' + flight.message + '</div>' :
                '<div class="info-box">' + flight.message + '</div>'}
            
            <h4>Outbound Flight</h4>
            <div class="result-item">
                <span class="result-label">Route:</span>
                <span class="result-value">${flight.outbound.departure.city} (${flight.outbound.departure.airport}) → ${flight.outbound.arrival.city} (${flight.outbound.arrival.airport})</span>
            </div>
            <div class="result-item">
                <span class="result-label">Departure:</span>
                <span class="result-value">${flight.outbound.departure.date} at ${flight.outbound.departure.time}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Duration:</span>
                <span class="result-value">${flight.outbound.durationFormatted} ${flight.outbound.stops > 0 ? `(${flight.outbound.stops} stop)` : '(direct)'}</span>
            </div>
            
            <h4 style="margin-top: 15px;">Return Flight</h4>
            <div class="result-item">
                <span class="result-label">Route:</span>
                <span class="result-value">${flight.return.departure.city} (${flight.return.departure.airport}) → ${flight.return.arrival.city} (${flight.return.arrival.airport})</span>
            </div>
            <div class="result-item">
                <span class="result-label">Departure:</span>
                <span class="result-value">${flight.return.departure.date} at ${flight.return.departure.time}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Duration:</span>
                <span class="result-value">${flight.return.durationFormatted} ${flight.return.stops > 0 ? `(${flight.return.stops} stop)` : '(direct)'}</span>
            </div>
            
            <h4 style="margin-top: 15px;">Pricing</h4>
            <div class="result-item">
                <span class="result-label">Economy Class:</span>
                <span class="result-value">${formatCurrency(flight.pricing.economy, 'CAD')}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Business Class:</span>
                <span class="result-value">${formatCurrency(flight.pricing.business, 'CAD')}</span>
            </div>
            <div class="result-item">
                <span class="result-label"><strong>Selected (${flight.businessClassEligible ? 'Business' : 'Economy'}):</strong></span>
                <span class="result-value"><strong>${formatCurrency(costs.flights.total, 'CAD')}</strong></span>
            </div>
            
            <p class="help-text" style="margin-top: 10px;">${flight.note}</p>
        `;
    } else {
        document.getElementById('flightInfo').style.display = 'none';
    }
    
    // Currency conversion info
    if (totals.conversion) {
        const currencyInfo = document.getElementById('currencyInfo');
        const currencyDetails = document.getElementById('currencyDetails');
        currencyInfo.style.display = 'block';
        
        currencyDetails.innerHTML = `
            <div class="result-item">
                <span class="result-label">Exchange Rate:</span>
                <span class="result-value">${totals.conversion.formatted.rate}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Original (CAD):</span>
                <span class="result-value">${totals.conversion.formatted.original}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Converted (${totals.selectedCurrency}):</span>
                <span class="result-value">${totals.conversion.formatted.converted}</span>
            </div>
        `;
    } else {
        document.getElementById('currencyInfo').style.display = 'none';
    }
    
    // Total cost
    const totalCostDiv = document.getElementById('totalCost');
    totalCostDiv.innerHTML = `
        <div>${formatCurrency(totals.selectedCurrencyTotal, totals.selectedCurrency)}</div>
        ${totals.selectedCurrency !== 'CAD' ? 
            `<div style="font-size: 0.6em; margin-top: 10px;">(${formatCurrency(totals.cadTotal, 'CAD')} CAD)</div>` : 
            ''}
    `;
    
    // Show results
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = `Error: ${message}`;
    errorDiv.style.display = 'block';
    errorDiv.scrollIntoView({ behavior: 'smooth' });
}

// Export results as JSON
function exportToJSON() {
    if (!window.lastCalculation) {
        alert('No calculation results to export');
        return;
    }
    
    const dataStr = JSON.stringify(window.lastCalculation, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `travel-estimate-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Make exportToJSON available globally
window.exportToJSON = exportToJSON;
