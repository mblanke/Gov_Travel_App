const Amadeus = require("amadeus");
require("dotenv").config();
const sampleFlightsData = require("./data/sampleFlights.json");
const openFlightsService = require("./openFlightsService");

// Initialize Amadeus client only if credentials are available
let amadeus = null;

function initAmadeus() {
  if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) {
    console.warn("⚠️  Amadeus API credentials not configured");
    return null;
  }

  try {
    return new Amadeus({
      clientId: process.env.AMADEUS_API_KEY,
      clientSecret: process.env.AMADEUS_API_SECRET,
    });
  } catch (error) {
    console.error("Failed to initialize Amadeus client:", error.message);
    return null;
  }
}

amadeus = initAmadeus();

/**
 * Search for flight offers between two cities
 * @param {string} originCode - IATA airport code (e.g., 'YOW' for Ottawa)
 * @param {string} destinationCode - IATA airport code (e.g., 'YVR' for Vancouver)
 * @param {string} departureDate - Date in YYYY-MM-DD format
 * @param {string} returnDate - Date in YYYY-MM-DD format (optional for one-way)
 * @param {number} adults - Number of adult passengers (default: 1)
 * @returns {Promise<Object>} Flight offers with prices and duration
 */
async function searchFlights(
  originCode,
  destinationCode,
  departureDate,
  returnDate = null,
  adults = 1
) {
  try {
    // Try OpenFlights first (free, no API key needed)
    console.log(
      `🔍 Searching for flights ${originCode} → ${destinationCode} using OpenFlights...`
    );
    const openFlightsResults = await openFlightsService.generateFlights(
      originCode,
      destinationCode,
      departureDate
    );

    if (openFlightsResults && openFlightsResults.length > 0) {
      return {
        success: true,
        flights: openFlightsResults,
        cheapest: openFlightsResults.reduce((min, f) =>
          f.price < min.price ? f : min
        ),
        message: `Found ${openFlightsResults.length} real flight options from OpenFlights data`,
        source: "OpenFlights",
      };
    }

    // If no OpenFlights data found, try Amadeus
    if (!amadeus) {
      return createSampleFlightResponse(
        originCode,
        destinationCode,
        departureDate,
        returnDate,
        "Route not found in OpenFlights database. Add AMADEUS_API_KEY and AMADEUS_API_SECRET for live pricing."
      );
    }

    // Try Amadeus API
    console.log("🔍 Route not in OpenFlights, trying Amadeus API...");
    const searchParams = {
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate: departureDate,
      adults: adults,
      currencyCode: "CAD",
      max: 5, // Get top 5 cheapest options
    };

    // Add return date if provided (round trip)
    if (returnDate) {
      searchParams.returnDate = returnDate;
    }

    const response = await amadeus.shopping.flightOffersSearch.get(
      searchParams
    );

    if (!response.data || response.data.length === 0) {
      // Try OpenFlights as fallback
      const fallbackFlights = await openFlightsService.generateFlights(
        originCode,
        destinationCode,
        departureDate
      );
      if (fallbackFlights && fallbackFlights.length > 0) {
        return {
          success: true,
          flights: fallbackFlights,
          cheapest: fallbackFlights.reduce((min, f) =>
            f.price < min.price ? f : min
          ),
          message: `Amadeus found no results. Using OpenFlights data.`,
          source: "OpenFlights (fallback)",
        };
      }
      return {
        success: false,
        message: "No flights found for this route",
      };
    }

    // Process flight offers
    const flights = response.data.map((offer) => {
      const itinerary = offer.itineraries[0]; // Outbound flight
      const segments = itinerary.segments;

      // Calculate total duration in hours
      const durationMinutes = parseDuration(itinerary.duration);
      const durationHours = durationMinutes / 60;

      // Determine if business class eligible (9+ hours)
      const businessClassEligible = durationHours >= 9;

      // Extract stop information (intermediate airports)
      const stopCodes = segments
        .slice(0, -1)
        .map((seg) => seg.arrival.iataCode);

      return {
        price: parseFloat(offer.price.total),
        currency: offer.price.currency,
        duration: itinerary.duration,
        durationHours: durationHours.toFixed(1),
        businessClassEligible: businessClassEligible,
        stops: segments.length - 1,
        stopCodes: stopCodes,
        carrier: segments[0].carrierCode,
        departureTime: segments[0].departure.at,
        arrivalTime: segments[segments.length - 1].arrival.at,
      };
    });

    // Sort by price (cheapest first)
    flights.sort((a, b) => a.price - b.price);

    return {
      success: true,
      flights: flights,
      cheapest: flights[0],
      message: `Found ${flights.length} flight options`,
      source: "Amadeus",
    };
  } catch (error) {
    console.error("Amadeus API Error:", error.response?.data || error.message);

    // Try OpenFlights as fallback
    try {
      const fallbackFlights = await openFlightsService.generateFlights(
        originCode,
        destinationCode,
        departureDate
      );
      if (fallbackFlights && fallbackFlights.length > 0) {
        return {
          success: true,
          flights: fallbackFlights,
          cheapest: fallbackFlights.reduce((min, f) =>
            f.price < min.price ? f : min
          ),
          message: `Error reaching Amadeus API. Using OpenFlights data.`,
          source: "OpenFlights (fallback)",
          error: error.message,
        };
      }
    } catch (fallbackError) {
      console.error("OpenFlights fallback error:", fallbackError.message);
    }

    const sampleResponse = createSampleFlightResponse(
      originCode,
      destinationCode,
      departureDate,
      returnDate,
      `Error reaching Amadeus API (${error.message}). Showing sample flights.`
    );
    return {
      ...sampleResponse,
      error: error.message,
    };
  }
}

function createSampleFlightResponse(
  originCode,
  destinationCode,
  departureDate,
  returnDate,
  message
) {
  const flights = buildSampleFlights(
    originCode,
    destinationCode,
    departureDate,
    returnDate
  );
  return {
    success: true,
    flights,
    cheapest: flights[0] || null,
    message,
    isSampleData: true,
    needsSetup: true,
  };
}

function buildSampleFlights(
  originCode,
  destinationCode,
  departureDate,
  returnDate
) {
  return sampleFlightsData
    .map((flight, index) => ({
      ...flight,
      originCode,
      destinationCode,
      departureDate,
      returnDate,
      id: `sample-${index + 1}`,
    }))
    .sort((a, b) => a.price - b.price);
}

/**
 * Parse ISO 8601 duration to minutes
 * Example: "PT10H30M" -> 630 minutes
 */
function parseDuration(duration) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?/;
  const matches = duration.match(regex);
  const hours = parseInt(matches[1] || 0);
  const minutes = parseInt(matches[2] || 0);
  return hours * 60 + minutes;
}

/**
 * Get IATA airport code from city name
 * This is a simplified version - in production, use a proper airport database
 */
function getAirportCode(cityName) {
  const airportCodes = {
    // Canadian Cities
    ottawa: "YOW",
    toronto: "YYZ",
    montreal: "YUL",
    vancouver: "YVR",
    calgary: "YYC",
    edmonton: "YEG",
    winnipeg: "YWG",
    halifax: "YHZ",
    victoria: "YYJ",
    quebec: "YQB",
    regina: "YQR",
    saskatoon: "YXE",
    "thunder bay": "YQT",
    whitehorse: "YXY",
    yellowknife: "YZF",
    iqaluit: "YFB",

    // Additional Canadian Cities with Airports
    charlottetown: "YYG",
    fredericton: "YFC",
    moncton: "YQM",
    saintjohn: "YSJ",
    "saint john": "YSJ",
    stjohns: "YYT",
    "st johns": "YYT",
    "st. john's": "YYT",
    kelowna: "YLW",
    kamloops: "YKA",
    princegeorge: "YXS",
    "prince george": "YXS",
    nanaimo: "YCD",
    fortmcmurray: "YMM",
    "fort mcmurray": "YMM",
    grandeprarie: "YQU",
    "grande prairie": "YQU",
    lethbridge: "YQL",
    medicinehat: "YXH",
    "medicine hat": "YXH",
    reddeer: "YQF",
    "red deer": "YQF",
    cranbrook: "YXC",
    penticton: "YYF",
    princealbert: "YPA",
    "prince albert": "YPA",
    yorkton: "YQV",
    sudbury: "YSB",
    saultstemarie: "YAM",
    "sault ste marie": "YAM",
    "sault ste. marie": "YAM",
    timmins: "YTS",
    northbay: "YYB",
    "north bay": "YYB",
    windsor: "YQG",
    kingston: "YGK",
    peterborough: "YPQ",
    barrie: "YLK",
    inuvik: "YEV",
    fortstjohn: "YXJ",
    "fort st john": "YXJ",
    "fort st. john": "YXJ",
    terrace: "YXT",

    // Canadian Cities using nearby airports
    gatineau: "YOW", // Use Ottawa
    laval: "YUL", // Use Montreal
    mississauga: "YYZ", // Use Toronto
    brampton: "YYZ", // Use Toronto
    markham: "YYZ", // Use Toronto
    vaughan: "YYZ", // Use Toronto
    "richmond hill": "YYZ", // Use Toronto
    richmondhill: "YYZ", // Use Toronto
    oakville: "YYZ", // Use Toronto
    burlington: "YYZ", // Use Toronto
    hamilton: "YHM",
    kitchener: "YKF",
    waterloo: "YKF", // Use Kitchener
    guelph: "YKF", // Use Kitchener
    cambridge: "YKF", // Use Kitchener
    brantford: "YHM", // Use Hamilton
    stcatharines: "YCM",
    "st catharines": "YCM",
    "st. catharines": "YCM",
    niagarafalls: "YCM", // Use St. Catharines
    "niagara falls": "YCM",
    oshawa: "YYZ", // Use Toronto
    whitby: "YYZ", // Use Toronto
    ajax: "YYZ", // Use Toronto
    pickering: "YYZ", // Use Toronto
    clarington: "YYZ", // Use Toronto
    milton: "YYZ", // Use Toronto
    newmarket: "YYZ", // Use Toronto
    aurora: "YYZ", // Use Toronto
    orillia: "YYZ", // Use Toronto
    cornwall: "YOW", // Use Ottawa
    sherbrooke: "YSC",
    troisrivieres: "YRQ",
    "trois rivieres": "YRQ",
    "trois-rivieres": "YRQ",
    surrey: "YVR", // Use Vancouver
    delta: "YVR", // Use Vancouver
    langley: "YVR", // Use Vancouver
    northvancouver: "YVR", // Use Vancouver
    "north vancouver": "YVR",
    westvancouver: "YVR", // Use Vancouver
    "west vancouver": "YVR",
    portcoquitlam: "YVR", // Use Vancouver
    "port coquitlam": "YVR",
    portmoody: "YVR", // Use Vancouver
    "port moody": "YVR",
    chilliwack: "YCW",
    courtenay: "YCA",
    duncan: "YVR", // Use Vancouver
    vernon: "YVE",
    westkelowna: "YLW", // Use Kelowna
    "west kelowna": "YLW",
    whistler: "YVR", // Use Vancouver
    powellriver: "YPW",
    "powell river": "YPW",
    airdrie: "YYC", // Use Calgary
    cochrane: "YYC", // Use Calgary
    sprucegrove: "YEG", // Use Edmonton
    "spruce grove": "YEG",
    strathcona: "YEG", // Use Edmonton
    woodbuffalo: "YMM", // Use Fort McMurray
    "wood buffalo": "YMM",
    acheson: "YEG", // Use Edmonton
    drumheller: "YYC", // Use Calgary
    stratford: "YKF", // Use Kitchener
    welland: "YCM", // Use St. Catharines

    // US Cities
    "new york": "JFK",
    "los angeles": "LAX",
    chicago: "ORD",
    miami: "MIA",
    "san francisco": "SFO",
    seattle: "SEA",
    boston: "BOS",
    washington: "IAD",
    atlanta: "ATL",
    dallas: "DFW",
    denver: "DEN",
    phoenix: "PHX",
    "las vegas": "LAS",
    orlando: "MCO",
    anchorage: "ANC",

    // International
    london: "LHR",
    paris: "CDG",
    frankfurt: "FRA",
    amsterdam: "AMS",
    rome: "FCO",
    madrid: "MAD",
    barcelona: "BCN",
    tokyo: "NRT",
    beijing: "PEK",
    "hong kong": "HKG",
    singapore: "SIN",
    dubai: "DXB",
    sydney: "SYD",
    melbourne: "MEL",
    canberra: "CBR",
    auckland: "AKL",
    "mexico city": "MEX",
    "sao paulo": "GRU",
    "buenos aires": "EZE",
    johannesburg: "JNB",
    cairo: "CAI",
    delhi: "DEL",
    mumbai: "BOM",
    bangkok: "BKK",
    seoul: "ICN",
    istanbul: "IST",
    moscow: "SVO",
    oslo: "OSL",
    stockholm: "ARN",
    copenhagen: "CPH",
    helsinki: "HEL",
    reykjavik: "KEF",
    dublin: "DUB",
    brussels: "BRU",
    zurich: "ZRH",
    geneva: "GVA",
    vienna: "VIE",
    prague: "PRG",
    warsaw: "WAW",
    athens: "ATH",
    lisbon: "LIS",
    "tel aviv": "TLV",
    riyadh: "RUH",
    doha: "DOH",
    "abu dhabi": "AUH",
    "kuala lumpur": "KUL",
    manila: "MNL",
    jakarta: "CGK",

    // Baltic & Eastern Europe
    riga: "RIX",
    tallinn: "TLL",
    vilnius: "VNO",
    bucharest: "OTP",
    budapest: "BUD",
    sofia: "SOF",
    belgrade: "BEG",
    zagreb: "ZAG",
    bratislava: "BTS",
    ljubljana: "LJU",
    sarajevo: "SJJ",
    skopje: "SKP",
    tirana: "TIA",
    podgorica: "TGD",
    minsk: "MSQ",
    kyiv: "KBP",
    kiev: "KBP",

    // Southeast Asia
    vientiane: "VTE",
    "viet nam": "VTE", // Laos capital
    "ho chi minh city": "SGN",
    hanoi: "HAN",

    // Middle East
    beirut: "BEY",

    // Africa
    maseru: "MSU",
    monrovia: "MLW",
    tripoli: "TIP",

    // Western Europe (additional)
    vaduz: "ZRH", // Liechtenstein - no airport, use Zurich
    luxembourg: "LUX",

    // Additional European cities
    milan: "MXP",
    venice: "VCE",
    florence: "FLR",
    naples: "NAP",
    munich: "MUC",
    berlin: "BER",
    hamburg: "HAM",
    cologne: "CGN",
    lyon: "LYS",
    marseille: "MRS",
    nice: "NCE",

    // Additional Asian cities
    shanghai: "PVG",
    guangzhou: "CAN",
    shenzhen: "SZX",
    osaka: "KIX",
    taipei: "TPE",
    seoul: "ICN",
    busan: "PUS",

    // Additional Middle Eastern cities
    jerusalem: "TLV",
    amman: "AMM",
    beirut: "BEY",
    baghdad: "BGW",
    kuwait: "KWI",
    muscat: "MCT",
    sanaa: "SAH",

    // Additional African cities
    nairobi: "NBO",
    lagos: "LOS",
    accra: "ACC",
    casablanca: "CMN",
    tunis: "TUN",
    algiers: "ALG",
    addis: "ADD",
    "addis ababa": "ADD",
    dar: "DAR",
    "dar es salaam": "DAR",

    // Latin America
    rio: "GIG",
    "rio de janeiro": "GIG",
    riodejaneiro: "GIG",
    lima: "LIM",
    santiago: "SCL",
    bogota: "BOG",
    caracas: "CCS",
    quito: "UIO",
    montevideo: "MVD",
    "san jose": "SJO",
    sanjose: "SJO",
    panama: "PTY",
    "panama city": "PTY",
    havana: "HAV",
    "mexico city": "MEX",
    mexicocity: "MEX",
    "buenos aires": "EZE",
    buenosaires: "EZE",
    "sao paulo": "GRU",
    saopaulo: "GRU",

    // US Cities (Additional)
    albany: "ALB",
    albuquerque: "ABQ",
    austin: "AUS",
    baltimore: "BWI",
    buffalo: "BUF",
    charleston: "CHS",
    charlotte: "CLT",
    cincinnati: "CVG",
    cleveland: "CLE",
    columbus: "CMH",
    detroit: "DTW",
    fortlauderdale: "FLL",
    "fort lauderdale": "FLL",
    honolulu: "HNL",
    houston: "IAH",
    indianapolis: "IND",
    jacksonville: "JAX",
    kansascity: "MCI",
    "kansas city": "MCI",
    lasvegas: "LAS",
    "las vegas": "LAS",
    losangeles: "LAX",
    "los angeles": "LAX",
    louisville: "SDF",
    memphis: "MEM",
    milwaukee: "MKE",
    minneapolis: "MSP",
    nashville: "BNA",
    neworleans: "MSY",
    "new orleans": "MSY",
    newyork: "JFK",
    "new york": "JFK",
    oklahomacity: "OKC",
    "oklahoma city": "OKC",
    philadelphia: "PHL",
    pittsburgh: "PIT",
    portland: "PDX",
    raleigh: "RDU",
    richmond: "RIC",
    sacramento: "SMF",
    saltlakecity: "SLC",
    "salt lake city": "SLC",
    sanantonio: "SAT",
    "san antonio": "SAT",
    sandiego: "SAN",
    "san diego": "SAN",
    sanfrancisco: "SFO",
    "san francisco": "SFO",
    stlouis: "STL",
    "st louis": "STL",
    "st. louis": "STL",
    tampa: "TPA",
    tucson: "TUS",

    // Additional International Cities
    hongkong: "HKG",
    newdelhi: "DEL",
    "new delhi": "DEL",
    kualalumpur: "KUL",
    hochiminh: "SGN",
    "ho chi minh": "SGN",
    telaviv: "TLV",
    abuja: "ABV",
    dakar: "DSS",
    addisababa: "ADD",
    capetown: "CPT",
    "cape town": "CPT",
    krakow: "KRK",
    spalato: "SPU", // Split, Croatia
    split: "SPU",
    dubrovnik: "DBV",
    stpetersburg: "LED",
    "st petersburg": "LED",
    "saint petersburg": "LED",
    ankara: "ESB",
    astana: "NQZ",
    almaty: "ALA",
    tbilisi: "TBS",
    baku: "GYD",
    bishkek: "FRU",
    dushanbe: "DYU",
  };

  const normalized = cityName.toLowerCase().replace(/,.*$/, "").trim();
  return airportCodes[normalized] || null;
}

module.exports = {
  searchFlights,
  getAirportCode,
};
