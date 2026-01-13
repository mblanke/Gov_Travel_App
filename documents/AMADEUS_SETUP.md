# Amadeus Flight API Setup Guide

This application now automatically searches for real flight prices using the **Amadeus Flight API**.

## 🎯 Features

- ✈️ **Automatic flight price search** - No manual entry needed
- ⏱️ **Automatic duration calculation** - Determines business class eligibility  
- 💰 **Real-time pricing** in CAD
- 🎫 **Multiple flight options** - Shows cheapest flights
- 🚨 **Business class detection** - Flags flights ≥9 hours automatically

---

## 📋 Prerequisites

You need a **free Amadeus Self-Service API account**:
- **2,000 free API calls per month**
- No credit card required for development tier
- Official airline pricing data

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Register for Amadeus API

1. Go to: **https://developers.amadeus.com/register**
2. Create a free account
3. Verify your email

### Step 2: Create an Application

1. Log in to: **https://developers.amadeus.com/my-apps**
2. Click **"Create New App"**
3. Enter app details:
   - **App Name:** Government Travel Estimator
   - **Description:** Travel cost calculator for government employees
4. Click **"Create"**

### Step 3: Get Your API Credentials

After creating the app, you'll see:
- **API Key** (Client ID)
- **API Secret** (Client Secret)

⚠️ **Keep these confidential!**

### Step 4: Configure the Application

1. Open the `.env` file in the project root
2. Add your credentials:

```env
AMADEUS_API_KEY=your_api_key_here
AMADEUS_API_SECRET=your_api_secret_here
```

### Step 5: Restart the Server

```powershell
# Stop the current server (Ctrl+C)
# Then restart:
npm start
```

You should see:
```
✅ Amadeus API configured
```

---

## 🎮 How to Use

1. **Enter Travel Details:**
   - Departure City: Ottawa
   - Destination City: Vancouver
   - Departure Date
   - Return Date

2. **Select Transportation:**
   - Choose "Flight"

3. **Click "Search Flights Automatically"**
   - App will search for real flights
   - Shows 5 cheapest options
   - Duration and business class eligibility shown

4. **Select a Flight:**
   - Click on any flight option
   - Price and duration auto-populate
   - Continue with accommodation estimate

5. **Calculate Total Cost:**
   - Scroll down
   - Enter accommodation estimate
   - Click "Calculate Estimate"

---

## 🌍 Supported Cities

The app includes airport codes for **60+ cities**:

### 🇨🇦 Canadian Cities
Ottawa, Toronto, Montreal, Vancouver, Calgary, Edmonton, Winnipeg, Halifax, Quebec City, Whitehorse, Yellowknife, Iqaluit, and more

### 🇺🇸 US Cities  
New York, Los Angeles, Chicago, San Francisco, Seattle, Boston, Washington DC, Miami, Dallas, Denver, Las Vegas, and more

### 🌏 International
London, Paris, Frankfurt, Amsterdam, Tokyo, Hong Kong, Singapore, Dubai, Sydney, Auckland, Mexico City, and more

---

## 🔧 Troubleshooting

### Error: "Amadeus API credentials not configured"

**Solution:** Add your API key and secret to the `.env` file

### Error: "Could not find airport codes"

**Solution:** The city name needs to match one in the database. Try:
- "Ottawa" instead of "Ottawa, ON"
- "New York" instead of "NYC"
- "Vancouver" instead of "Vancouver, BC"

### Error: "No flights found for this route"

**Possible causes:**
- Date is too far in the future (try within 11 months)
- Route not available (small airports may not have data)
- Try searching on Google Flights manually

### API Rate Limits

Free tier: **2,000 calls/month**
- Each search = 1 API call
- ~66 searches per day
- Perfect for small teams

If you exceed limits, you'll get an error. Wait until next month or upgrade to paid tier.

---

## 💡 API Limits & Best Practices

### Free Tier Limits
- ✅ 2,000 API calls/month
- ✅ Test & development use
- ✅ No credit card required

### Tips to Save API Calls
1. Only search when dates are finalized
2. Use manual Google Flights link for rough estimates
3. Share results with colleagues instead of re-searching
4. Consider caching common routes

---

## 🔐 Security Notes

- ✅ `.env` file is in `.gitignore` (won't be committed)
- ✅ Never share your API credentials
- ✅ API keys are server-side only
- ✅ Not exposed to browser/frontend

---

## 📊 What Gets Calculated

For each flight search, you get:
- **Price** in CAD
- **Duration** in hours (for business class rules)
- **Number of stops** (direct vs. connections)
- **Business class eligibility** (≥9 hours)
- **Carrier** information
- **Departure/arrival times**

---

## 🎓 Amadeus Documentation

For more details:
- **API Docs:** https://developers.amadeus.com/self-service/category/flights
- **Support:** https://developers.amadeus.com/support
- **Dashboard:** https://developers.amadeus.com/my-apps

---

## ⚙️ Alternative: Manual Entry

Don't want to set up the API? **No problem!**

The app still has the Google Flights integration:
1. Click the Google Flights link
2. Copy the price
3. Paste into the form
4. Enter duration manually

Takes about 30 seconds per search.

---

## 🧪 Sample Flights (No API)

When the Amadeus credentials are not configured (for example in a fresh Docker build or when you want to keep the app self-hosted without API keys), the backend returns curated sample flights from `data/sampleFlights.json`. You can still click *Search Flights Automatically*, review the mock options, and select one to populate the form. The status banner will mention that these are placeholder flights, so you know when to add real credentials and get live pricing.

---

## 🆘 Getting Help

### API Issues
Contact Amadeus Support: https://developers.amadeus.com/support

### App Issues  
Check the server console for error messages

### Still Stuck?
The app works fine without the API - use manual Google Flights links instead.

---

## ✨ Benefits of API Integration

| Feature | Manual Entry | With Amadeus API |
|---------|-------------|------------------|
| Speed | 30 seconds | 5 seconds |
| Accuracy | User dependent | Official data |
| Business class detection | Manual | Automatic |
| Multiple options | One at a time | 5 instantly |
| Up-to-date prices | User checks | Real-time |
| Effort | Medium | Low |

---

**You're all set!** 🎉

The app will now automatically search flights and calculate costs with real airline data.
