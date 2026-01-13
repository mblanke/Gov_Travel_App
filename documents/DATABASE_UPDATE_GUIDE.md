# Database Update Guide

This guide explains how to update the per diem and accommodation rate databases when new rates are published by the National Joint Council or other government sources.

## 📁 Database Files

The application uses two JSON database files located in the `data/` directory:

1. **`perDiemRates.json`** - Meal allowances, incidental expenses, and private accommodation rates
2. **`accommodationRates.json`** - Hotel and commercial accommodation rates by city

## 🔄 When to Update

Update the databases when:
- NJC publishes new travel directive rates (typically annually)
- Accommodation rates change in the government directory
- New cities or regions are added to coverage
- Currency exchange rates significantly change

## 📋 How to Update Per Diem Rates

### Step 1: Check Official Sources
Visit these official sources for current rates:
- [NJC Appendix C - Canada & USA Rates](https://www.njc-cnm.gc.ca/directive/travel-voyage/td-dv-a3-eng.php)
- [NJC Appendix D - International Rates](https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en)

### Step 2: Update `perDiemRates.json`

1. Open `data/perDiemRates.json` in a text editor
2. Update the **metadata** section:
   ```json
   "metadata": {
     "effectiveDate": "YYYY-MM-DD",
     "version": "X.X",
     "lastUpdated": "YYYY-MM-DD"
   }
   ```

3. Update rates for each region. Example for Canada:
   ```json
   "canada": {
     "name": "Canada (Provinces)",
     "currency": "CAD",
     "meals": {
       "breakfast": {
         "rate100": 29.05,  // Update this value
         "rate75": 21.80,   // 75% of rate100
         "rate50": 14.55    // 50% of rate100
       },
       "lunch": {
         "rate100": 29.60,
         "rate75": 22.20,
         "rate50": 14.80
       },
       "dinner": {
         "rate100": 60.75,
         "rate75": 45.55,
         "rate50": 30.40
       }
     },
     "incidentals": {
       "rate100": 17.30,
       "rate75": 13.00
     }
   }
   ```

4. **Calculate derived rates**:
   - `rate75` = `rate100` × 0.75
   - `rate50` = `rate100` × 0.50
   - Update `total` rates as sum of breakfast + lunch + dinner

5. Repeat for all regions: `canada`, `yukon`, `nwt`, `nunavut`, `usa`, `alaska`, `international`

### Step 3: Validate JSON Format

Before saving, validate your JSON:
- Use an online JSON validator (e.g., jsonlint.com)
- Ensure all brackets, braces, and commas are correct
- Check that numbers don't have quotes around them

## 🏨 How to Update Accommodation Rates

### Step 1: Check Official Sources
Visit:
- [Government Accommodation Directory](https://rehelv-acrd.tpsgc-pwgsc.gc.ca/lth-crl-eng.aspx)
- Select specific cities to see current rates

### Step 2: Update `accommodationRates.json`

1. Open `data/accommodationRates.json` in a text editor
2. Update the **metadata** section with new date and version

3. Update or add city rates:
   ```json
   "cityname": {
     "name": "City Name, Province",
     "province": "Province/State",
     "region": "canada",
     "standardRate": 150.00,  // Update this
     "maxRate": 185.00,       // Update this
     "currency": "CAD",
     "notes": "Any special notes"
   }
   ```

4. **Key guidelines**:
   - City keys should be lowercase, no spaces (e.g., "newyork", "losangeles")
   - `standardRate` = typical government-approved rate
   - `maxRate` = maximum without special authorization
   - Include `currency` (CAD or USD)

5. Update **defaults** section for regional averages:
   ```json
   "defaults": {
     "canada": {
       "standardRate": 150.00,
       "maxRate": 185.00,
       "currency": "CAD"
     }
   }
   ```

### Step 3: Add New Cities

To add a new city:
```json
"citykey": {
  "name": "Full City Name, Province/State",
  "province": "Province or State",
  "region": "canada|usa|yukon|nwt|nunavut|alaska|international",
  "standardRate": 0.00,
  "maxRate": 0.00,
  "currency": "CAD|USD",
  "notes": "Optional notes about the city"
}
```

## ✅ Testing After Updates

1. **Save both JSON files**
2. **Refresh the web application** in your browser
3. **Test with different destinations**:
   - Select each destination type
   - Verify meal rates are correct
   - Check accommodation suggestions
4. **Verify the footer** shows updated effective date
5. **Check browser console** (F12) for any errors

## 🌍 International Rates

International rates are more complex as they vary by country. For international updates:

1. Consult [NJC Appendix D](https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en)
2. Rates may be in local currency or CAD
3. Add new countries to `internationalCities` section
4. Include currency conversion notes

Example:
```json
"citykey": {
  "name": "City Name, Country",
  "country": "Country Name",
  "region": "international",
  "standardRate": 200.00,
  "maxRate": 300.00,
  "currency": "CAD",
  "notes": "Convert from EUR/GBP/etc. High cost city."
}
```

## 📊 Rate Tiers (Extended Stay)

The application currently uses 100% rates. For extended stays (31+ days, 121+ days), the database includes reduced rates:

- **Days 1-30**: Use `rate100` (100% of allowance)
- **Days 31-120**: Use `rate75` (75% of meal allowance)
- **Days 121+**: Use `rate50` (50% of meal allowance, 75% incidentals)

*Note: Extended stay logic can be implemented in future versions.*

## 🔒 Data Integrity Checklist

Before finalizing updates:

- [ ] All numbers are valid decimals (use .00 format)
- [ ] No missing commas between items
- [ ] All JSON brackets and braces match
- [ ] Metadata dates are updated
- [ ] Version number is incremented
- [ ] Calculations are correct (rate75 = rate100 × 0.75)
- [ ] Currency codes are uppercase (CAD, USD)
- [ ] Region codes match application options
- [ ] File saved with UTF-8 encoding

## 📞 Support Resources

**Official Government Sources:**
- [NJC Travel Directive Main Page](https://www.njc-cnm.gc.ca/directive/d10/en)
- [Appendix C - Canadian/USA Rates](https://www.njc-cnm.gc.ca/directive/travel-voyage/td-dv-a3-eng.php)
- [Appendix D - International Rates](https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en)
- [Accommodation Directory](https://rehelv-acrd.tpsgc-pwgsc.gc.ca/lth-crl-eng.aspx)

**JSON Validation Tools:**
- [JSONLint](https://jsonlint.com/)
- [JSON Formatter](https://jsonformatter.curiousconcept.com/)

## 📝 Version History Template

Keep a log of database updates:

```
Version 1.1 - 2025-XX-XX
- Updated meal rates for Canada based on new NJC directive
- Added 3 new cities to accommodation database
- Adjusted international rates for currency changes

Version 1.0 - 2025-10-30
- Initial database creation
- Rates effective October 1, 2025
```

## ⚠️ Important Notes

1. **Always backup** the existing JSON files before making changes
2. **Test thoroughly** after updates to ensure the app still functions
3. **Document changes** in the metadata section
4. **Validate JSON** before deploying to avoid application errors
5. **Communicate updates** to users about new effective dates

## 🚀 Quick Update Workflow

1. 📥 Download latest rates from NJC website
2. 📋 Open JSON files in text editor
3. ✏️ Update rates and metadata
4. ✅ Validate JSON syntax
5. 💾 Save files
6. 🧪 Test in browser
7. 📢 Document changes
8. ✨ Deploy updates

---

**Last Updated:** October 30, 2025  
**Database Version:** 1.0
