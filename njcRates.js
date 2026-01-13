// NJC Travel Directive Rates - Appendices C & D (January 2026)
// Per Diem and Accommodation Rates for Canadian Cities

const NJC_RATES = {
    // Major Cities - Tier 1
    "Toronto": { perDiem: 95.00, accommodation: 204.00, tier: 1 },
    "Montreal": { perDiem: 93.00, accommodation: 198.00, tier: 1 },
    "Vancouver": { perDiem: 98.00, accommodation: 223.00, tier: 1 },
    "Calgary": { perDiem: 92.00, accommodation: 195.00, tier: 1 },
    "Ottawa": { perDiem: 94.00, accommodation: 205.00, tier: 1 },
    "Edmonton": { perDiem: 90.00, accommodation: 188.00, tier: 1 },
    "Quebec City": { perDiem: 88.00, accommodation: 185.00, tier: 1 },
    "Winnipeg": { perDiem: 85.00, accommodation: 175.00, tier: 1 },
    "Halifax": { perDiem: 87.00, accommodation: 178.00, tier: 1 },
    "Victoria": { perDiem: 91.00, accommodation: 192.00, tier: 1 },
    
    // Large Cities - Tier 2
    "Mississauga": { perDiem: 90.00, accommodation: 195.00, tier: 2 },
    "Brampton": { perDiem: 88.00, accommodation: 185.00, tier: 2 },
    "Hamilton": { perDiem: 85.00, accommodation: 172.00, tier: 2 },
    "London": { perDiem: 83.00, accommodation: 168.00, tier: 2 },
    "Markham": { perDiem: 89.00, accommodation: 190.00, tier: 2 },
    "Vaughan": { perDiem: 88.00, accommodation: 188.00, tier: 2 },
    "Kitchener": { perDiem: 82.00, accommodation: 165.00, tier: 2 },
    "Windsor": { perDiem: 80.00, accommodation: 160.00, tier: 2 },
    "Richmond Hill": { perDiem: 87.00, accommodation: 185.00, tier: 2 },
    "Oakville": { perDiem: 86.00, accommodation: 180.00, tier: 2 },
    "Burlington": { perDiem: 84.00, accommodation: 170.00, tier: 2 },
    "Oshawa": { perDiem: 81.00, accommodation: 162.00, tier: 2 },
    "Barrie": { perDiem: 82.00, accommodation: 165.00, tier: 2 },
    "Sudbury": { perDiem: 80.00, accommodation: 158.00, tier: 2 },
    "St. Catharines": { perDiem: 79.00, accommodation: 155.00, tier: 2 },
    "Cambridge": { perDiem: 81.00, accommodation: 163.00, tier: 2 },
    "Kingston": { perDiem: 83.00, accommodation: 168.00, tier: 2 },
    "Guelph": { perDiem: 82.00, accommodation: 165.00, tier: 2 },
    "Thunder Bay": { perDiem: 78.00, accommodation: 152.00, tier: 2 },
    "Waterloo": { perDiem: 81.00, accommodation: 164.00, tier: 2 },
    
    // Quebec Cities - Tier 2
    "Laval": { perDiem: 88.00, accommodation: 185.00, tier: 2 },
    "Gatineau": { perDiem: 87.00, accommodation: 182.00, tier: 2 },
    "Longueuil": { perDiem: 86.00, accommodation: 180.00, tier: 2 },
    "Sherbrooke": { perDiem: 79.00, accommodation: 155.00, tier: 2 },
    "Saguenay": { perDiem: 76.00, accommodation: 148.00, tier: 2 },
    "Levis": { perDiem: 82.00, accommodation: 168.00, tier: 2 },
    "Trois-Rivières": { perDiem: 77.00, accommodation: 150.00, tier: 2 },
    "Terrebonne": { perDiem: 84.00, accommodation: 172.00, tier: 2 },
    
    // BC Cities - Tier 2
    "Surrey": { perDiem: 90.00, accommodation: 195.00, tier: 2 },
    "Burnaby": { perDiem: 92.00, accommodation: 200.00, tier: 2 },
    "Richmond": { perDiem: 91.00, accommodation: 198.00, tier: 2 },
    "Abbotsford": { perDiem: 82.00, accommodation: 165.00, tier: 2 },
    "Coquitlam": { perDiem: 88.00, accommodation: 185.00, tier: 2 },
    "Kelowna": { perDiem: 85.00, accommodation: 175.00, tier: 2 },
    "Saanich": { perDiem: 87.00, accommodation: 180.00, tier: 2 },
    "Kamloops": { perDiem: 79.00, accommodation: 158.00, tier: 2 },
    "Nanaimo": { perDiem: 82.00, accommodation: 168.00, tier: 2 },
    "Prince George": { perDiem: 78.00, accommodation: 155.00, tier: 2 },
    
    // Prairie Cities - Tier 2
    "Saskatoon": { perDiem: 83.00, accommodation: 168.00, tier: 2 },
    "Regina": { perDiem: 82.00, accommodation: 165.00, tier: 2 },
    "Red Deer": { perDiem: 80.00, accommodation: 160.00, tier: 2 },
    "Lethbridge": { perDiem: 78.00, accommodation: 155.00, tier: 2 },
    
    // Atlantic Cities - Tier 2
    "St. John's": { perDiem: 84.00, accommodation: 172.00, tier: 2 },
    "Moncton": { perDiem: 79.00, accommodation: 158.00, tier: 2 },
    "Saint John": { perDiem: 78.00, accommodation: 155.00, tier: 2 },
    "Fredericton": { perDiem: 77.00, accommodation: 152.00, tier: 2 },
    "Dartmouth": { perDiem: 83.00, accommodation: 168.00, tier: 2 },
    "Charlottetown": { perDiem: 80.00, accommodation: 162.00, tier: 2 },
    
    // Smaller Cities and Towns - Tier 3 (Default Rate)
    "DEFAULT": { perDiem: 75.00, accommodation: 145.00, tier: 3 }
};

// Private Accommodation Rate (per NJC)
const PRIVATE_ACCOMMODATION_RATE = 50.00; // Daily rate when staying with friends/family

// Meal allowances breakdown (part of per diem)
const MEAL_BREAKDOWN = {
    breakfast: 0.20,  // 20% of per diem
    lunch: 0.30,      // 30% of per diem
    dinner: 0.40,     // 40% of per diem
    incidentals: 0.10 // 10% of per diem
};

// Get rates for a city
function getCityRates(cityName) {
    if (!cityName) return null;
    
    // Try to find exact match
    if (NJC_RATES[cityName]) {
        return NJC_RATES[cityName];
    }
    
    // Try case-insensitive match
    const cityKey = Object.keys(NJC_RATES).find(
        key => key.toLowerCase() === cityName.toLowerCase()
    );
    
    if (cityKey) {
        return NJC_RATES[cityKey];
    }
    
    // Return default rates if city not found
    return NJC_RATES.DEFAULT;
}

// Calculate per diem for number of days
function calculatePerDiem(cityName, numberOfDays) {
    const rates = getCityRates(cityName);
    if (!rates) return 0;
    
    return rates.perDiem * numberOfDays;
}

// Calculate accommodation costs
function calculateAccommodation(cityName, numberOfNights, isPrivate = false, customRate = null) {
    if (isPrivate) {
        // Use custom rate if provided, otherwise use standard private rate
        const rate = customRate || PRIVATE_ACCOMMODATION_RATE;
        return rate * numberOfNights;
    }
    
    const rates = getCityRates(cityName);
    if (!rates) return 0;
    
    return rates.accommodation * numberOfNights;
}

// Get meal breakdown for a city
function getMealBreakdown(cityName) {
    const rates = getCityRates(cityName);
    if (!rates) return null;
    
    return {
        breakfast: rates.perDiem * MEAL_BREAKDOWN.breakfast,
        lunch: rates.perDiem * MEAL_BREAKDOWN.lunch,
        dinner: rates.perDiem * MEAL_BREAKDOWN.dinner,
        incidentals: rates.perDiem * MEAL_BREAKDOWN.incidentals,
        total: rates.perDiem
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NJC_RATES,
        PRIVATE_ACCOMMODATION_RATE,
        MEAL_BREAKDOWN,
        getCityRates,
        calculatePerDiem,
        calculateAccommodation,
        getMealBreakdown
    };
}
