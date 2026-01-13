// Currency Converter Module
// Supports EUR, AUD, CAD, USD with auto-conversion

// Exchange rates (as of January 2026)
// In production, these should be fetched from a real-time API
const EXCHANGE_RATES = {
    CAD: {
        CAD: 1.0,
        USD: 0.72,
        EUR: 0.66,
        AUD: 1.12
    },
    USD: {
        CAD: 1.39,
        USD: 1.0,
        EUR: 0.92,
        AUD: 1.56
    },
    EUR: {
        CAD: 1.52,
        USD: 1.09,
        EUR: 1.0,
        AUD: 1.69
    },
    AUD: {
        CAD: 0.89,
        USD: 0.64,
        EUR: 0.59,
        AUD: 1.0
    }
};

// Currency symbols
const CURRENCY_SYMBOLS = {
    CAD: 'C$',
    USD: 'US$',
    EUR: '€',
    AUD: 'A$'
};

// Convert amount from one currency to another
function convertCurrency(amount, fromCurrency, toCurrency) {
    if (!amount || amount < 0) return 0;
    if (fromCurrency === toCurrency) return amount;
    
    if (!EXCHANGE_RATES[fromCurrency] || !EXCHANGE_RATES[fromCurrency][toCurrency]) {
        console.error(`Conversion rate not available for ${fromCurrency} to ${toCurrency}`);
        return amount;
    }
    
    const rate = EXCHANGE_RATES[fromCurrency][toCurrency];
    return amount * rate;
}

// Format currency amount with symbol
function formatCurrency(amount, currency) {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
}

// Get exchange rate
function getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1.0;
    
    if (!EXCHANGE_RATES[fromCurrency] || !EXCHANGE_RATES[fromCurrency][toCurrency]) {
        return null;
    }
    
    return EXCHANGE_RATES[fromCurrency][toCurrency];
}

// Calculate and format conversion details
function getConversionDetails(amount, fromCurrency, toCurrency) {
    const rate = getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = convertCurrency(amount, fromCurrency, toCurrency);
    
    return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        targetCurrency: toCurrency,
        exchangeRate: rate,
        convertedAmount: convertedAmount,
        formatted: {
            original: formatCurrency(amount, fromCurrency),
            converted: formatCurrency(convertedAmount, toCurrency),
            rate: `1 ${fromCurrency} = ${rate} ${toCurrency}`
        }
    };
}

// Get all supported currencies
function getSupportedCurrencies() {
    return Object.keys(EXCHANGE_RATES);
}

// Validate currency code
function isValidCurrency(currencyCode) {
    return EXCHANGE_RATES.hasOwnProperty(currencyCode);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EXCHANGE_RATES,
        CURRENCY_SYMBOLS,
        convertCurrency,
        formatCurrency,
        getExchangeRate,
        getConversionDetails,
        getSupportedCurrencies,
        isValidCurrency
    };
}
