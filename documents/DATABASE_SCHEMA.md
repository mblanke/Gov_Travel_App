# Database Schema Reference

Quick reference for the JSON database structure used in the Government Travel Cost Estimator.

## 📄 perDiemRates.json Structure

```json
{
  "metadata": {
    "effectiveDate": "YYYY-MM-DD",
    "version": "string",
    "source": "string",
    "lastUpdated": "YYYY-MM-DD",
    "notes": "string"
  },
  "regions": {
    "regionKey": {
      "name": "string",
      "currency": "CAD|USD",
      "meals": {
        "breakfast": {
          "rate100": number,
          "rate75": number,
          "rate50": number
        },
        "lunch": { ... },
        "dinner": { ... },
        "total": { ... }
      },
      "incidentals": {
        "rate100": number,
        "rate75": number
      },
      "privateAccommodation": {
        "day1to120": number,
        "day121onward": number
      },
      "dailyTotal": {
        "rate100": number,
        "rate75": number,
        "rate50plus75": number
      }
    }
  },
  "rateRules": {
    "day1to30": "rate100",
    "day31to120": "rate75",
    "day121onward": "rate50",
    "description": "string"
  }
}
```

### Valid Region Keys
- `canada` - Canadian provinces
- `yukon` - Yukon Territory
- `nwt` - Northwest Territories
- `nunavut` - Nunavut Territory
- `usa` - Continental United States
- `alaska` - Alaska
- `international` - International destinations

### Rate Types
- **rate100** - Days 1-30 (100% of allowance)
- **rate75** - Days 31-120 (75% of meal allowance)
- **rate50** - Days 121+ (50% of meal allowance)

## 📄 accommodationRates.json Structure

```json
{
  "metadata": {
    "effectiveDate": "YYYY-MM-DD",
    "version": "string",
    "source": "string",
    "lastUpdated": "YYYY-MM-DD",
    "notes": "string"
  },
  "cities": {
    "citykey": {
      "name": "string",
      "province": "string",
      "region": "regionKey",
      "standardRate": number,
      "maxRate": number,
      "currency": "CAD|USD",
      "notes": "string"
    }
  },
  "defaults": {
    "regionKey": {
      "standardRate": number,
      "maxRate": number,
      "currency": "CAD|USD"
    }
  },
  "internationalCities": {
    "citykey": {
      "name": "string",
      "country": "string",
      "region": "international",
      "standardRate": number,
      "maxRate": number,
      "currency": "CAD",
      "notes": "string"
    }
  }
}
```

### City Key Format
- Lowercase only
- No spaces (use concatenation: "newyork", "losangeles")
- No special characters
- No accents (use "montreal" not "montréal")

### Rate Fields
- **standardRate** - Typical government-approved rate
- **maxRate** - Maximum rate without special authorization

## 🔗 Field Relationships

### Per Diem Calculations
```
dailyMealTotal = breakfast.rate100 + lunch.rate100 + dinner.rate100
dailyTotal = dailyMealTotal + incidentals.rate100
```

### Extended Stay
- Days 1-30: Use rate100 values
- Days 31-120: Use rate75 for meals, rate75 for incidentals
- Days 121+: Use rate50 for meals, rate75 for incidentals

### Accommodation
- If private accommodation: Use privateAccommodation rates
- If hotel: Use estimated cost or database suggestions
- Compare to maxRate for validation

## 📊 Data Types

| Field | Type | Format | Required |
|-------|------|--------|----------|
| effectiveDate | string | YYYY-MM-DD | Yes |
| version | string | X.X | Yes |
| lastUpdated | string | YYYY-MM-DD | Yes |
| rate100, rate75, rate50 | number | decimal (2 places) | Yes |
| standardRate, maxRate | number | decimal (2 places) | Yes |
| currency | string | CAD or USD | Yes |
| region | string | Valid region key | Yes |
| name | string | Free text | Yes |
| notes | string | Free text | No |

## 🔍 Lookup Logic

### Per Diem Lookup
1. Get `destinationType` from user input
2. Look up `perDiemRatesDB.regions[destinationType]`
3. Extract meal and incidental rates
4. Calculate based on number of days

### Accommodation Lookup
1. Get `destinationCity` (normalized to lowercase, no spaces)
2. Try: `accommodationRatesDB.cities[cityKey]`
3. If not found, try: `accommodationRatesDB.internationalCities[cityKey]`
4. If not found, use: `accommodationRatesDB.defaults[regionType]`

## ✅ Validation Rules

### Per Diem Rates
- All rates must be > 0
- rate75 should equal rate100 × 0.75
- rate50 should equal rate100 × 0.50
- Total rates should sum correctly
- Currency must be CAD or USD

### Accommodation Rates
- standardRate must be > 0
- maxRate must be >= standardRate
- Region must match valid region keys
- City keys must be unique
- Currency must be CAD or USD

## 🌐 Currency Handling

- **CAD** - Canadian Dollar (primary currency)
- **USD** - US Dollar (for USA and Alaska)
- International rates converted to CAD equivalent
- Display currency based on region in UI

## 📝 Example Entries

### Per Diem Entry (Canada)
```json
"canada": {
  "name": "Canada (Provinces)",
  "currency": "CAD",
  "meals": {
    "breakfast": { "rate100": 29.05, "rate75": 21.80, "rate50": 14.55 },
    "lunch": { "rate100": 29.60, "rate75": 22.20, "rate50": 14.80 },
    "dinner": { "rate100": 60.75, "rate75": 45.55, "rate50": 30.40 }
  },
  "incidentals": { "rate100": 17.30, "rate75": 13.00 },
  "privateAccommodation": { "day1to120": 50.00, "day121onward": 25.00 }
}
```

### Accommodation Entry (Toronto)
```json
"toronto": {
  "name": "Toronto, ON",
  "province": "Ontario",
  "region": "canada",
  "standardRate": 180.00,
  "maxRate": 220.00,
  "currency": "CAD",
  "notes": "Major urban center"
}
```

## 🔄 Update Frequency

- **Per Diem Rates**: Annually (typically October 1st)
- **Accommodation Rates**: Quarterly or as needed
- Check official sources regularly for updates

## 📚 References

- [NJC Appendix C](https://www.njc-cnm.gc.ca/directive/travel-voyage/td-dv-a3-eng.php)
- [NJC Appendix D](https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en)
- [Accommodation Directory](https://rehelv-acrd.tpsgc-pwgsc.gc.ca/lth-crl-eng.aspx)

---

**Document Version:** 1.0  
**Last Updated:** October 30, 2025
