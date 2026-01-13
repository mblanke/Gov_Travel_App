// Configuration file for Amadeus API
// To enable real-time flight search, add your Amadeus API credentials here

// Instructions to get Amadeus API credentials:
// 1. Visit https://developers.amadeus.com/
// 2. Sign up for a free account
// 3. Create a new app in your dashboard
// 4. Copy your API Key and API Secret
// 5. Paste them below

const CONFIG = {
    amadeus: {
        // Replace these with your actual Amadeus API credentials
        apiKey: null,  // Your Amadeus API Key
        apiSecret: null,  // Your Amadeus API Secret
        environment: 'test'  // 'test' or 'production'
    }
};

// Initialize Amadeus API if credentials are provided
if (CONFIG.amadeus.apiKey && CONFIG.amadeus.apiSecret) {
    if (typeof configureAmadeusAPI === 'function') {
        configureAmadeusAPI(CONFIG.amadeus.apiKey, CONFIG.amadeus.apiSecret);
        console.log('Amadeus API configured successfully');
    }
} else {
    console.log('Amadeus API not configured - using mock flight data');
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
