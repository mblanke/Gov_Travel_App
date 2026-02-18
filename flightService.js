const Amadeus = require("amadeus");
require("dotenv").config();
const sampleFlightsData = require("./data/sampleFlights.json");

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
  // Check if Amadeus is configured
  if (!amadeus) {
    return createSampleFlightResponse(
      originCode,
      destinationCode,
      departureDate,
      returnDate,
      "Amadeus API not configured; showing sample flights. Add AMADEUS_API_KEY and AMADEUS_API_SECRET to unlock live pricing."
    );
  }

  try {
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

      // Extract layover details from segments
      const layovers = [];
      for (let i = 0; i < segments.length - 1; i++) {
        const arrivalTime = new Date(segments[i].arrival.at);
        const nextDepartureTime = new Date(segments[i + 1].departure.at);
        const layoverMs = nextDepartureTime - arrivalTime;
        const layoverMinutes = Math.round(layoverMs / 60000);
        const layoverHours = Math.floor(layoverMinutes / 60);
        const layoverMins = layoverMinutes % 60;
        const durationISO = `PT${layoverHours > 0 ? layoverHours + "H" : ""}${layoverMins > 0 ? layoverMins + "M" : ""}`;

        layovers.push({
          airport: segments[i].arrival.iataCode,
          city: segments[i].arrival.iataCode, // IATA code as fallback
          duration: durationISO,
          layoverMinutes: layoverMinutes,
        });
      }

      return {
        price: parseFloat(offer.price.total),
        currency: offer.price.currency,
        duration: itinerary.duration,
        durationHours: durationHours.toFixed(1),
        businessClassEligible: businessClassEligible,
        stops: segments.length - 1,
        carrier: segments[0].carrierCode,
        departureTime: segments[0].departure.at,
        arrivalTime: segments[segments.length - 1].arrival.at,
        layovers: layovers,
      };
    });

    // Sort by price (cheapest first)
    flights.sort((a, b) => a.price - b.price);

    return {
      success: true,
      flights: flights,
      cheapest: flights[0],
      message: `Found ${flights.length} flight options`,
    };
  } catch (error) {
    console.error("Amadeus API Error:", error.response?.data || error.message);
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
    .map((flight, index) => {
      const layovers = generateSampleLayovers(
        originCode,
        destinationCode,
        flight.stops,
        flight.carrier
      );
      return {
        ...flight,
        layovers,
        originCode,
        destinationCode,
        departureDate,
        returnDate,
        id: `sample-${index + 1}`,
      };
    })
    .sort((a, b) => a.price - b.price);
}

/**
 * Generate geographically sensible layover cities for sample flights.
 * Uses the destination airport code to determine region, then picks
 * realistic connecting hubs along the way.
 */
function generateSampleLayovers(originCode, destinationCode, stops, carrier) {
  if (stops === 0) return [];

  const dest = (destinationCode || "").toUpperCase();
  const orig = (originCode || "").toUpperCase();

  // Classify destination region by IATA code patterns & known codes
  const region = getAirportRegion(dest);
  const originRegion = getAirportRegion(orig);

  // Hub pools by region — each entry is { airport, city, layoverMinutes }
  const canadaHubs = [
    { airport: "YYZ", city: "Toronto", layoverMinutes: 105 },
    { airport: "YUL", city: "Montreal", layoverMinutes: 90 },
  ];
  const europeWestHubs = [
    { airport: "LHR", city: "London", layoverMinutes: 150 },
    { airport: "CDG", city: "Paris", layoverMinutes: 130 },
    { airport: "AMS", city: "Amsterdam", layoverMinutes: 110 },
  ];
  const europeCentralHubs = [
    { airport: "FRA", city: "Frankfurt", layoverMinutes: 120 },
    { airport: "MUC", city: "Munich", layoverMinutes: 135 },
    { airport: "ZRH", city: "Zurich", layoverMinutes: 100 },
  ];
  const europeNorthHubs = [
    { airport: "CPH", city: "Copenhagen", layoverMinutes: 95 },
    { airport: "ARN", city: "Stockholm", layoverMinutes: 110 },
    { airport: "HEL", city: "Helsinki", layoverMinutes: 105 },
  ];
  const usEastHubs = [
    { airport: "JFK", city: "New York", layoverMinutes: 120 },
    { airport: "IAD", city: "Washington", layoverMinutes: 100 },
    { airport: "ORD", city: "Chicago", layoverMinutes: 115 },
  ];
  const usWestHubs = [
    { airport: "LAX", city: "Los Angeles", layoverMinutes: 135 },
    { airport: "SFO", city: "San Francisco", layoverMinutes: 110 },
    { airport: "SEA", city: "Seattle", layoverMinutes: 95 },
  ];
  const middleEastHubs = [
    { airport: "IST", city: "Istanbul", layoverMinutes: 170 },
    { airport: "DXB", city: "Dubai", layoverMinutes: 180 },
    { airport: "DOH", city: "Doha", layoverMinutes: 150 },
  ];
  const asiaEastHubs = [
    { airport: "NRT", city: "Tokyo", layoverMinutes: 140 },
    { airport: "ICN", city: "Seoul", layoverMinutes: 120 },
    { airport: "HKG", city: "Hong Kong", layoverMinutes: 130 },
  ];
  const asiaSouthHubs = [
    { airport: "SIN", city: "Singapore", layoverMinutes: 155 },
    { airport: "BKK", city: "Bangkok", layoverMinutes: 140 },
  ];

  // Build a route chain based on destination region
  let hubChain = [];

  switch (region) {
    case "canada":
      // Domestic: use Canadian hubs
      hubChain = [
        ...canadaHubs,
        { airport: "YWG", city: "Winnipeg", layoverMinutes: 75 },
        { airport: "YYC", city: "Calgary", layoverMinutes: 85 },
        { airport: "YEG", city: "Edmonton", layoverMinutes: 80 },
      ];
      break;
    case "europe-west":
    case "europe-south":
      // Canada → (Canadian hub) → European hub
      hubChain = [...canadaHubs, ...europeWestHubs];
      break;
    case "europe-central":
      hubChain = [...canadaHubs, ...europeWestHubs, ...europeCentralHubs];
      break;
    case "europe-north":
    case "europe-east":
      hubChain = [...canadaHubs, ...europeWestHubs, ...europeCentralHubs, ...europeNorthHubs];
      break;
    case "middle-east":
      hubChain = [...canadaHubs, ...europeWestHubs, ...middleEastHubs];
      break;
    case "asia-east":
      hubChain = [...canadaHubs, ...usWestHubs, ...asiaEastHubs];
      break;
    case "asia-south":
    case "oceania":
      hubChain = [...canadaHubs, ...usWestHubs, ...asiaEastHubs, ...asiaSouthHubs];
      break;
    case "us-east":
      hubChain = [...canadaHubs, ...usEastHubs];
      break;
    case "us-west":
      hubChain = [...canadaHubs, ...usWestHubs];
      break;
    case "south-america":
      hubChain = [...canadaHubs, ...usEastHubs, { airport: "MIA", city: "Miami", layoverMinutes: 130 }];
      break;
    case "africa":
      hubChain = [...canadaHubs, ...europeWestHubs, ...middleEastHubs];
      break;
    default:
      // Generic international
      hubChain = [...canadaHubs, ...europeWestHubs, ...europeCentralHubs];
      break;
  }

  // Filter out origin and destination from the chain
  hubChain = hubChain.filter(
    (h) => h.airport !== orig && h.airport !== dest
  );

  // Pick 'stops' hubs, spaced evenly through the chain
  const selected = [];
  for (let i = 0; i < stops && i < hubChain.length; i++) {
    const idx = Math.floor(((i + 1) * hubChain.length) / (stops + 1));
    const pick = hubChain[Math.min(idx, hubChain.length - 1)];
    if (!selected.includes(pick)) {
      selected.push(pick);
    }
  }

  // Fallback: if we couldn't pick enough, just take the first N available
  while (selected.length < stops && hubChain.length > selected.length) {
    const next = hubChain.find((h) => !selected.includes(h));
    if (next) selected.push(next);
    else break;
  }

  // Format as layover objects
  return selected.map((hub) => {
    const hrs = Math.floor(hub.layoverMinutes / 60);
    const mins = hub.layoverMinutes % 60;
    const duration = `PT${hrs > 0 ? hrs + "H" : ""}${mins > 0 ? mins + "M" : ""}`;
    return {
      airport: hub.airport,
      city: hub.city,
      duration,
      layoverMinutes: hub.layoverMinutes,
    };
  });
}

/**
 * Classify an IATA airport code into a geographic region.
 */
function getAirportRegion(code) {
  // Canadian airports start with Y
  if (/^Y[A-Z]{2}$/.test(code)) return "canada";

  const regionMap = {
    // US East
    JFK: "us-east", EWR: "us-east", LGA: "us-east", IAD: "us-east", DCA: "us-east",
    BOS: "us-east", ATL: "us-east", ORD: "us-east", MIA: "us-east", PHL: "us-east",
    CLT: "us-east", DTW: "us-east", MSP: "us-east",
    // US West
    LAX: "us-west", SFO: "us-west", SEA: "us-west", DEN: "us-west", PHX: "us-west",
    LAS: "us-west", PDX: "us-west", SAN: "us-west", HNL: "us-west",
    // Europe West
    LHR: "europe-west", LGW: "europe-west", CDG: "europe-west", ORY: "europe-west",
    AMS: "europe-west", BRU: "europe-west", DUB: "europe-west",
    // Europe Central
    FRA: "europe-central", MUC: "europe-central", ZRH: "europe-central",
    VIE: "europe-central", PRG: "europe-central", BUD: "europe-central",
    WAW: "europe-central", GVA: "europe-central",
    // Europe North
    CPH: "europe-north", ARN: "europe-north", HEL: "europe-north",
    OSL: "europe-north", TLL: "europe-north", RIX: "europe-north",
    VNO: "europe-north", KEF: "europe-north",
    // Europe South
    FCO: "europe-south", MAD: "europe-south", BCN: "europe-south",
    LIS: "europe-south", ATH: "europe-south", MXP: "europe-south",
    // Europe East
    SVO: "europe-east", DME: "europe-east", LED: "europe-east",
    KBP: "europe-east", OTP: "europe-east", SOF: "europe-east",
    // Middle East
    IST: "middle-east", DXB: "middle-east", DOH: "middle-east",
    AUH: "middle-east", TLV: "middle-east", AMM: "middle-east",
    // Asia East
    NRT: "asia-east", HND: "asia-east", ICN: "asia-east",
    PEK: "asia-east", PVG: "asia-east", HKG: "asia-east",
    TPE: "asia-east", KIX: "asia-east",
    // Asia South
    SIN: "asia-south", BKK: "asia-south", KUL: "asia-south",
    DEL: "asia-south", BOM: "asia-south", CGK: "asia-south",
    MNL: "asia-south", HAN: "asia-south", SGN: "asia-south",
    // Oceania
    SYD: "oceania", MEL: "oceania", AKL: "oceania",
    BNE: "oceania", PER: "oceania",
    // Africa
    JNB: "africa", CAI: "africa", NBO: "africa",
    CPT: "africa", ADD: "africa", CMN: "africa",
    // South America
    GRU: "south-america", EZE: "south-america", BOG: "south-america",
    SCL: "south-america", LIM: "south-america", GIG: "south-america",
    // Central America / Caribbean
    MEX: "south-america", CUN: "south-america", PTY: "south-america",
    SJU: "south-america", NAS: "south-america",
    // Australia (alternate)
    CBR: "oceania",
  };

  return regionMap[code] || "international";
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
    busan: "PUS",

    // Additional Middle Eastern cities
    jerusalem: "TLV",
    amman: "AMM",
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
    mexicocity: "MEX",
    buenosaires: "EZE",
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
    losangeles: "LAX",
    louisville: "SDF",
    memphis: "MEM",
    milwaukee: "MKE",
    minneapolis: "MSP",
    nashville: "BNA",
    neworleans: "MSY",
    "new orleans": "MSY",
    newyork: "JFK",
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
