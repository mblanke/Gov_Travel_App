/**
 * Rebuild database/travel_rates.db from the canonical JSON rate files.
 *
 * The JSON files in data/ are the single source of truth (hand-authored for
 * Appendix B/C, scraper-generated via gov_travel.transform for ACRD and
 * Appendix D). This script is the ONLY writer of the SQLite database.
 *
 * Builds into travel_rates.db.tmp, runs self-assertions against known NJC
 * values, then atomically renames over the live file. Exits non-zero (and
 * leaves the live DB untouched) if anything fails.
 *
 * Usage: npm run migrate
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DB_DIR = path.join(ROOT, "database");
const DB_PATH = path.join(DB_DIR, "travel_rates.db");
const TMP_PATH = `${DB_PATH}.tmp`;

const perDiem = require(path.join(ROOT, "data", "perDiemRates.json"));
const transportation = require(path.join(ROOT, "data", "transportationRates.json"));
const accommodation = require(path.join(ROOT, "data", "accommodationRates.json"));
const international = require(path.join(ROOT, "data", "internationalRates.json"));

// The exact corruption a previous migration produced: iterating the JSON's
// top-level keys instead of the city entries.
const FORBIDDEN_CITY_KEYS = new Set(["metadata", "cities", "internationalCities", "defaults"]);

const REGIONS = [
  { code: "canada", name: "Canada (Provinces)", parent: null, currency: "CAD", taxes: 0 },
  { code: "yukon", name: "Yukon", parent: "canada", currency: "CAD", taxes: 0 },
  { code: "nwt", name: "Northwest Territories", parent: "canada", currency: "CAD", taxes: 0 },
  { code: "nunavut", name: "Nunavut", parent: "canada", currency: "CAD", taxes: 0 },
  { code: "usa", name: "Continental USA", parent: null, currency: "USD", taxes: 0 },
  { code: "alaska", name: "Alaska", parent: "usa", currency: "USD", taxes: 0 },
  { code: "international", name: "International", parent: null, currency: "USD", taxes: 1 },
];

// Province/territory code -> region for Canadian ACRD cities
const TERRITORY_REGIONS = { YT: "yukon", NT: "nwt", NU: "nunavut" };

const MEAL_TIERS = [
  ["day_1_30", "rate100", "rate100"],
  ["day_31_120", "rate75", "rate75"],
  // Meals drop to 50% at day 121; incidentals stay at the published 75% value
  ["day_121_plus", "rate50", "rate75"],
];

const APPENDIX_D_TIERS = {
  cDay_1_30: ["commercial", "day_1_30"],
  cDay_31_120: ["commercial", "day_31_120"],
  cDay_121_plus: ["commercial", "day_121_plus"],
  pDay_1_30: ["private", "day_1_30"],
  pDay_31_120: ["private", "day_31_120"],
  pDay_121_plus: ["private", "day_121_plus"],
};

function fail(message) {
  console.error(`MIGRATION FAILED: ${message}`);
  try {
    fs.unlinkSync(TMP_PATH);
  } catch {
    /* tmp may not exist */
  }
  process.exit(1);
}

function buildDatabase() {
  fs.rmSync(TMP_PATH, { force: true });
  const db = new Database(TMP_PATH);
  db.pragma("journal_mode = OFF");
  db.pragma("synchronous = OFF");

  const schema = fs.readFileSync(path.join(DB_DIR, "schema.sql"), "utf-8");
  db.exec(schema);

  // --- regions ---------------------------------------------------------------
  const insertRegion = db.prepare(
    "INSERT INTO regions (code, name, parent_code, default_currency, taxes_included) VALUES (?, ?, ?, ?, ?)"
  );
  for (const r of REGIONS) insertRegion.run(r.code, r.name, r.parent, r.currency, r.taxes);

  // --- meal + incidental region defaults (Appendix C, published values) ------
  const appendixCEffective = perDiem.metadata.effectiveDate;
  const insertMeal = db.prepare(
    `INSERT INTO meal_rates (region_code, city_key, accommodation_type, duration_tier,
       breakfast, lunch, dinner, total, currency, effective_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertIncidental = db.prepare(
    `INSERT INTO incidental_rates (region_code, city_key, accommodation_type, duration_tier, rate, currency)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const [regionCode, region] of Object.entries(perDiem.regions)) {
    for (const [tier, mealRate, incidentalRate] of MEAL_TIERS) {
      // NJC meal/incidental allowances don't vary by accommodation type in
      // Canada/USA; both rows exist because the schema keys on the type.
      for (const type of ["commercial", "private"]) {
        insertMeal.run(
          regionCode,
          null,
          type,
          tier,
          region.meals.breakfast[mealRate],
          region.meals.lunch[mealRate],
          region.meals.dinner[mealRate],
          region.meals.total[mealRate],
          region.currency,
          appendixCEffective
        );
        insertIncidental.run(regionCode, null, type, tier, region.incidentals[incidentalRate], region.currency);
      }
    }
  }

  // --- Appendix D city-specific meals/incidentals ---------------------------
  const appendixDEffective = international.metadata.effectiveDate;
  let appendixDMealRows = 0;
  for (const [countryKey, country] of Object.entries(international.countries)) {
    for (const [cityKey, city] of Object.entries(country.cities)) {
      const dbCityKey = `${countryKey}_${cityKey}`;
      for (const [tierKey, [type, tier]] of Object.entries(APPENDIX_D_TIERS)) {
        const meals = city.meals[tierKey];
        // '*' cells (reasonable expenses, receipts required) are null — no row
        if (!meals || meals.breakfast == null || meals.lunch == null || meals.dinner == null) continue;
        insertMeal.run(
          "international",
          dbCityKey,
          type,
          tier,
          meals.breakfast,
          meals.lunch,
          meals.dinner,
          meals.total != null ? meals.total : meals.breakfast + meals.lunch + meals.dinner,
          country.currency,
          appendixDEffective
        );
        appendixDMealRows++;
        const incidental = city.incidentals ? city.incidentals[tierKey] : null;
        if (incidental != null) {
          insertIncidental.run("international", dbCityKey, type, tier, incidental, country.currency);
        }
      }
    }
  }

  // --- accommodation limits (ACRD) -------------------------------------------
  const acrdEffective = accommodation.metadata.effectiveDate;
  const insertLimit = db.prepare(
    `INSERT INTO accommodation_limits (city_key, city_name, city_name_lower, province_state, country,
       region_code, currency, jan_rate, feb_rate, mar_rate, apr_rate, may_rate, jun_rate,
       jul_rate, aug_rate, sep_rate, oct_rate, nov_rate, dec_rate, default_rate, effective_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const usedKeys = new Set();

  function addLimit(key, entry, regionCode, provinceState, country) {
    if (FORBIDDEN_CITY_KEYS.has(key)) {
      fail(`accommodation city_key '${key}' is a JSON structure key — migration iterated the wrong level`);
    }
    let cityKey = key;
    let n = 2;
    while (usedKeys.has(cityKey)) cityKey = `${key}${n++}`;
    usedKeys.add(cityKey);

    const monthly = entry.monthlyRates.map((v) => (v == null ? null : v));
    const known = monthly.filter((v) => v != null);
    if (known.length === 0) return;
    const defaultRate = Math.max(...known);
    insertLimit.run(
      cityKey,
      entry.name,
      entry.name.toLowerCase(),
      provinceState,
      country,
      regionCode,
      entry.currency,
      ...monthly,
      defaultRate,
      acrdEffective
    );
  }

  for (const [key, entry] of Object.entries(accommodation.cities)) {
    const provinceCode = (entry.name.split(",")[1] || "").trim();
    const regionCode = TERRITORY_REGIONS[provinceCode] || "canada";
    addLimit(key, entry, regionCode, entry.province, "Canada");
  }
  for (const [key, entry] of Object.entries(accommodation.internationalCities)) {
    if (entry.country === "USA") {
      const stateCode = (entry.name.split(",")[1] || "").trim();
      const regionCode = stateCode === "AK" ? "alaska" : "usa";
      addLimit(key, entry, regionCode, stateCode, "USA");
    } else {
      addLimit(key, entry, "international", null, entry.country);
    }
  }

  // --- kilometric rates (Appendix B) -----------------------------------------
  const kmEffective = transportation.metadata.effectiveDate;
  const insertKm = db.prepare(
    `INSERT INTO kilometric_rates (province_territory, province_code, rate_per_km, currency, effective_date, notes)
     VALUES (?, ?, ?, 'CAD', ?, ?)`
  );
  for (const [code, entry] of Object.entries(transportation.kilometricRates.provinces)) {
    insertKm.run(entry.name, code, entry.ratePerKm, kmEffective, transportation.kilometricRates.rule);
  }

  // --- private accommodation + weekend travel home ---------------------------
  const insertPrivate = db.prepare(
    "INSERT INTO private_accommodation_rates (region_code, duration_tier, rate, currency) VALUES (?, ?, ?, ?)"
  );
  const insertWeekend = db.prepare(
    "INSERT INTO weekend_travel_allowances (region_code, weekend_length, allowance, currency) VALUES (?, ?, ?, ?)"
  );
  for (const [regionCode, region] of Object.entries(perDiem.regions)) {
    insertPrivate.run(regionCode, "day_1_120", region.privateAccommodation.day1to120, region.currency);
    insertPrivate.run(regionCode, "day_121_plus", region.privateAccommodation.day121onward, region.currency);
    if (region.weekendTravelHome) {
      insertWeekend.run(regionCode, 2, region.weekendTravelHome.twoDay, region.currency);
      insertWeekend.run(regionCode, 3, region.weekendTravelHome.threeDay, region.currency);
      insertWeekend.run(regionCode, 4, region.weekendTravelHome.fourDay, region.currency);
    }
  }

  // --- metadata ---------------------------------------------------------------
  const insertMeta = db.prepare("INSERT INTO metadata (key, value) VALUES (?, ?)");
  insertMeta.run("schema_version", "3.0.0");
  insertMeta.run("migration_date", new Date().toISOString());
  insertMeta.run("appendix_b_effective", kmEffective);
  insertMeta.run("appendix_c_effective", appendixCEffective);
  insertMeta.run("appendix_d_effective", appendixDEffective);
  insertMeta.run("acrd_effective", acrdEffective);
  insertMeta.run("data_source", "data/*.json (canonical) — rebuild with npm run migrate");

  console.log(
    `Built: ${usedKeys.size} accommodation limits, ${appendixDMealRows} Appendix D meal rows, ` +
      `${Object.keys(transportation.kilometricRates.provinces).length} kilometric rates`
  );
  return db;
}

function assertClose(actual, expected, label) {
  if (actual == null || Math.abs(actual - expected) > 0.001) {
    fail(`${label}: expected ${expected}, got ${actual}`);
  }
}

function selfCheck(db) {
  const meal = db
    .prepare(
      "SELECT * FROM meal_rates WHERE region_code='canada' AND city_key IS NULL AND accommodation_type='commercial' AND duration_tier='day_1_30'"
    )
    .get();
  assertClose(meal && meal.total, 121.25, "Canada commercial day_1_30 meal total");
  assertClose(meal && meal.breakfast, 29.5, "Canada breakfast");

  const nunavut = db
    .prepare(
      "SELECT dinner FROM meal_rates WHERE region_code='nunavut' AND city_key IS NULL AND accommodation_type='commercial' AND duration_tier='day_1_30'"
    )
    .get();
  assertClose(nunavut && nunavut.dinner, 100.95, "Nunavut dinner");

  const inc100 = db
    .prepare(
      "SELECT rate FROM incidental_rates WHERE region_code='canada' AND city_key IS NULL AND accommodation_type='commercial' AND duration_tier='day_1_30'"
    )
    .get();
  assertClose(inc100 && inc100.rate, 25.0, "Canada incidentals 100%");
  const inc75 = db
    .prepare(
      "SELECT rate FROM incidental_rates WHERE region_code='canada' AND city_key IS NULL AND accommodation_type='commercial' AND duration_tier='day_31_120'"
    )
    .get();
  assertClose(inc75 && inc75.rate, 18.75, "Canada incidentals 75%");

  const on = db.prepare("SELECT rate_per_km FROM kilometric_rates WHERE province_code='ON'").get();
  assertClose(on && on.rate_per_km, 0.655, "Ontario kilometric");
  const yt = db.prepare("SELECT rate_per_km FROM kilometric_rates WHERE province_code='YT'").get();
  assertClose(yt && yt.rate_per_km, 0.73, "Yukon kilometric");

  const limits = db.prepare("SELECT COUNT(*) AS n FROM accommodation_limits").get().n;
  if (limits < 240) fail(`accommodation_limits has only ${limits} rows (expected >= 240)`);

  const junk = db
    .prepare(
      "SELECT COUNT(*) AS n FROM accommodation_limits WHERE city_key IN ('metadata','cities','internationalCities','defaults')"
    )
    .get().n;
  if (junk > 0) fail(`${junk} junk structure keys in accommodation_limits`);

  const ottawa = db.prepare("SELECT city_name FROM accommodation_limits WHERE city_key='ottawa'").get();
  if (!ottawa) fail("city_key 'ottawa' missing from accommodation_limits");

  const weekend = db
    .prepare("SELECT allowance FROM weekend_travel_allowances WHERE region_code='canada' AND weekend_length=2")
    .get();
  assertClose(weekend && weekend.allowance, 392.5, "Canada 2-day weekend travel home");

  const riga = db
    .prepare(
      "SELECT total FROM meal_rates WHERE region_code='international' AND city_key='latvia_riga' AND accommodation_type='commercial' AND duration_tier='day_1_30'"
    )
    .get();
  if (!riga) fail("Appendix D city latvia_riga missing from meal_rates");

  console.log("Self-check passed.");
}

function main() {
  const db = buildDatabase();
  selfCheck(db);
  db.close();
  fs.rmSync(DB_PATH, { force: true });
  fs.renameSync(TMP_PATH, DB_PATH);
  console.log(`Wrote ${DB_PATH}`);
}

main();
