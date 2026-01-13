# Government Travel Cost Estimator

A web application for estimating Canadian government travel costs based on the National Joint Council (NJC) Travel Directive.

## Features

- **Travel Details Input**: Enter departure/destination cities, travel dates, and destination type
- **Automatic Calculations**:
  - Flight costs with business class eligibility (9+ hour flights)
  - Accommodation costs (hotel or private accommodation)
  - Meal allowances (breakfast, lunch, dinner)
  - Incidental expense allowances
- **Destination Support**:
  - Canada (provinces)
  - Yukon
  - Northwest Territories
  - Nunavut
  - Continental USA
  - Alaska
  - International destinations
- **Policy Compliance**: Based on NJC Travel Directive effective October 1, 2025
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## How to Use

### Local File Access (Simple)
1. Open `index.html` in a web browser
2. Fill out the travel details form
3. Click "Calculate Estimate" to see the breakdown

### Web Server (Recommended)
```bash
# Install dependencies
npm install

# Start the server on port 5001
npm start
```

Then access:

### Environment Configuration

Before you start the server or build the Docker image, copy `.env.example` to `.env` and fill in your Amadeus credentials as documented in `AMADEUS_SETUP.md`:

```bash
cp .env.example .env
# update AMADEUS_API_KEY and AMADEUS_API_SECRET with your values
```

The application reads these values via `dotenv`, and the server warns if the keys are missing. Keep the `.env` file private and do not commit it.

### Docker Deployment
```bash
# Using Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t govt-travel-estimator .
docker run -d --env-file .env -p 5001:5001 govt-travel-estimator
```
Docker Compose now loads the `.env` file via `env_file`, so create the file before starting the stack.

See `DEPLOYMENT.md` for complete deployment instructions.

---

## Using the Application

1. Fill out the travel details form:
   - Enter departure and destination cities
   - Select travel dates
   - Choose destination type
   - **Select transportation mode** (Flight/Vehicle/Train)
   - Enter estimated costs or distances
2. Click "Calculate Estimate" to see the breakdown
3. Review the detailed cost breakdown and policy references

## Policy References

The application is based on the following government directives:

- [NJC Travel Directive (Main)](https://www.njc-cnm.gc.ca/directive/d10/en)
- [Appendix C - Allowances (Canada & USA)](https://www.njc-cnm.gc.ca/directive/travel-voyage/td-dv-a3-eng.php)
- [Appendix D - International Allowances](https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en)
- [Accommodation Directory](https://rehelv-acrd.tpsgc-pwgsc.gc.ca/lth-crl-eng.aspx)

## Key Features

### Business Class Eligibility
According to NJC Travel Directive Section 3.3.11 and 3.4.11, business class may be authorized for flights exceeding 9 hours. The app automatically adjusts flight cost estimates when this threshold is met.

### Meal Allowances
Daily meal allowances are calculated based on:
- Breakfast rates
- Lunch rates  
- Dinner rates
- Destination type (varies by region)

### Accommodation Options
- **Hotel/Commercial**: Enter estimated per-night cost
- **Private Non-Commercial**: Automatic allowance calculation ($50/night for Canadian destinations)

### Incidental Expenses
Automatic calculation of daily incidental allowances for:
- Tips
- Personal phone calls
- Laundry
- Other minor expenses

## Rates (Effective October 1, 2025)

### Canada
- Breakfast: $29.05
- Lunch: $29.60
- Dinner: $60.75
- Incidentals: $17.30/day
- Total Daily: $136.70

### Yukon
- Breakfast: $26.40
- Lunch: $33.50
- Dinner: $78.50
- Incidentals: $17.30/day
- Total Daily: $155.70

### Northwest Territories
- Breakfast: $30.05
- Lunch: $35.65
- Dinner: $76.05
- Incidentals: $17.30/day
- Total Daily: $159.05

### Nunavut
- Breakfast: $35.05
- Lunch: $41.60
- Dinner: $100.45
- Incidentals: $17.30/day
- Total Daily: $194.40

## Disclaimer

⚠️ **Important**: This is an estimation tool only. Actual costs and allowances may vary. Always consult with your Designated Departmental Travel Coordinator and follow the official NJC Travel Directive for final approval and reimbursement details.

## Files

- `index.html` - Main application interface
- `validation.html` - **Database validation dashboard**
- `styles.css` - Styling and responsive design
- `script.js` - Calculation logic and interactivity
- `data/perDiemRates.json` - **Database** of meal allowances and per diem rates
- `data/accommodationRates.json` - **Database** of hotel and accommodation rates
- `data/transportationRates.json` - **Database** of kilometric and train rates
- `Govt Links.txt` - Reference links to official government resources
- `README.md` - This documentation
- `DATABASE_UPDATE_GUIDE.md` - Instructions for updating rate databases

## 🔍 Rate Validation System

The application includes automatic rate validation:

- **Automatic Checks**: Validates database update dates on load
- **Warning System**: Displays alerts if rates are outdated (12+ months)
- **Visual Indicators**: Color-coded status for each database
- **Validation Dashboard**: Dedicated page for comprehensive database monitoring
- **Export Reports**: Generate validation reports for audit purposes

Access the validation dashboard at `validation.html` or click the link in the header.

## 💾 Database Structure

The application uses JSON databases for easy rate updates:

### Per Diem Rates Database
- Meal allowances (breakfast, lunch, dinner) by region
- Incidental expense allowances
- Private accommodation allowances
- Support for extended stay rate reductions (31+ and 121+ days)
- Effective dates and version tracking

### Accommodation Rates Database
- Standard and maximum rates for major cities
- Regional default rates
- International city rates
- Currency information
- Government-approved rate guidelines

**To update rates:** See `DATABASE_UPDATE_GUIDE.md` for detailed instructions.

## Technical Details

- Pure HTML, CSS, and JavaScript (no frameworks required)
- Responsive design using CSS Grid and Flexbox
- Client-side calculations (no server required)
- Modern browser support

## Future Enhancements

Potential improvements:
- Integration with real-time flight pricing APIs
- PDF export of estimates
- Save/load estimate functionality
- Currency conversion for international travel
- ✅ ~~Extended stay rate reductions (31+ and 121+ days)~~ - Database ready
- Multiple traveler support
- Automatic rate updates from government APIs
- City-specific accommodation suggestions (database ready)

## License

This tool is based on publicly available government directives and is intended for estimation purposes only.
