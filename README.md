# Government Travel Cost Estimator 🍁

A comprehensive web application for calculating official Canadian government travel costs per the National Joint Council (NJC) Travel Directive.

## Features

✅ **237+ City Database** - Complete database of Canadian cities with validation  
✅ **Real-Time Flight Search** - Amadeus API integration for live flight availability  
✅ **Multi-Currency Support** - EUR, AUD, CAD, USD with automatic conversion  
✅ **City-Specific Per Diem Rates** - Based on NJC Appendix C (January 2026)  
✅ **Accommodation Rates** - Based on NJC Appendix D (January 2026)  
✅ **Business Class Eligibility** - Automatic determination for 9+ hour flights  
✅ **Private Accommodation Options** - Support for staying with friends/family  
✅ **Export Functionality** - Export calculations as JSON  
✅ **Print Support** - Print-friendly format for expense reports

## Quick Start

### Option 1: Open Directly in Browser

1. Clone or download this repository
2. Open `index.html` in your web browser
3. Start calculating travel costs!

### Option 2: Using a Local Server (Recommended)

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server

# Then open http://localhost:8000 in your browser
```

## Usage

1. **Enter Travel Details**
   - Select departure city from 237+ Canadian cities
   - Select destination city
   - Choose departure and return dates
   - Select preferred currency (CAD, USD, EUR, or AUD)

2. **Accommodation Options**
   - Check "Private Accommodation" if staying with friends/family
   - Enter custom rate if applicable (optional)

3. **Optional Features**
   - Enable "Search Real-Time Flight Availability" for flight data
   - Requires Amadeus API configuration (see below)

4. **Calculate & Review**
   - Click "Calculate Travel Costs"
   - Review detailed breakdown including:
     - Accommodation costs
     - Per diem (meals & incidentals)
     - Flight information (if enabled)
     - Currency conversion details
     - Total estimated cost

5. **Export Results**
   - Print summary for expense reports
   - Export as JSON for record-keeping

## NJC Rate Tiers

The application uses three tiers of rates based on city size and cost of living:

- **Tier 1** - Major cities (Toronto, Montreal, Vancouver, etc.)
- **Tier 2** - Large cities and regional centers
- **Tier 3** - Smaller cities and towns (default rate)

### Sample Rates (January 2026)

| City | Per Diem | Accommodation | Tier |
|------|----------|---------------|------|
| Toronto | $95.00 | $204.00 | 1 |
| Vancouver | $98.00 | $223.00 | 1 |
| Calgary | $92.00 | $195.00 | 1 |
| Ottawa | $94.00 | $205.00 | 1 |
| Halifax | $87.00 | $178.00 | 1 |

### Private Accommodation Rate

When staying at private residences: **$50.00/night**

### Per Diem Breakdown

Daily per diem is allocated as follows:
- Breakfast: 20%
- Lunch: 30%
- Dinner: 40%
- Incidentals: 10%

## Business Class Eligibility

Business class is automatically approved for flights **9 hours or longer**, per NJC Travel Directive guidelines.

The application estimates flight durations and determines eligibility:
- ✓ Eligible: Flights ≥ 9 hours
- ✗ Not Eligible: Flights < 9 hours

## Amadeus API Configuration (Optional)

To enable real-time flight search:

1. **Get API Credentials**
   - Visit [Amadeus for Developers](https://developers.amadeus.com/)
   - Sign up for a free account
   - Create a new app
   - Copy your API Key and API Secret

2. **Configure the Application**
   - Open `config.js`
   - Add your credentials:
   ```javascript
   const CONFIG = {
       amadeus: {
           apiKey: 'YOUR_API_KEY_HERE',
           apiSecret: 'YOUR_API_SECRET_HERE',
           environment: 'test'
       }
   };
   ```

3. **Restart the Application**
   - Flight search will now use real-time data

**Note:** The application works without API configuration using estimated flight data.

## Currency Support

Supported currencies with automatic conversion:
- 🇨🇦 CAD - Canadian Dollar
- 🇺🇸 USD - US Dollar
- 🇪🇺 EUR - Euro
- 🇦🇺 AUD - Australian Dollar

Exchange rates are based on January 2026 values. In production, integrate with a real-time currency API for current rates.

## Project Structure

```
Gov_Travel_App/
├── index.html           # Main application interface
├── styles.css           # Application styling
├── cityData.js          # 237+ city database
├── njcRates.js          # NJC per diem and accommodation rates
├── currencyConverter.js # Multi-currency conversion
├── flightSearch.js      # Amadeus API integration
├── calculator.js        # Cost calculation engine
├── app.js              # Main application logic
├── config.js           # API configuration
└── README.md           # This file
```

## Data Sources

All rates are based on official NJC Travel Directive documentation:
- **Appendix C** - City-specific per diem rates
- **Appendix D** - Accommodation rates
- **Effective Date** - January 2026

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing style
- City data remains accurate
- NJC rates are kept up-to-date
- All features are tested

## License

This tool is provided as-is for calculating government travel costs per NJC Travel Directive guidelines.

## Disclaimer

This calculator is a tool to estimate travel costs based on NJC Travel Directive rates. Always verify calculations and consult your department's travel policy for specific requirements and approvals.

## Support

For issues or questions:
1. Check the documentation above
2. Review NJC Travel Directive guidelines
3. Open an issue on GitHub

---

**Version:** 1.0.0  
**Last Updated:** January 2026  
**Data Source:** NJC Travel Directive Appendices C & D