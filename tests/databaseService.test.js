/**
 * Unit tests for databaseService against the committed travel_rates.db.
 * Rate values are pinned to the published NJC tables:
 *   Appendix C effective 2026-04-01, Appendix B effective 2026-07-01.
 * If these fail after a rate refresh, update both data/*.json and these pins.
 */
const dbService = require("../services/databaseService");

beforeAll(() => dbService.connect());
afterAll(() => dbService.close());

describe("Appendix C meal and incidental rates", () => {
  test("Canada commercial day 1-30 matches published values", async () => {
    const meals = await dbService.getMealRates("canada", null, "commercial", 1);
    expect(meals.breakfast).toBeCloseTo(29.5);
    expect(meals.lunch).toBeCloseTo(30.05);
    expect(meals.dinner).toBeCloseTo(61.7);
    expect(meals.total).toBeCloseTo(121.25);
  });

  test("Nunavut meal total is the highest region", async () => {
    const meals = await dbService.getMealRates("nunavut", null, "commercial", 1);
    expect(meals.total).toBeCloseTo(177.95);
    expect(meals.dinner).toBeCloseTo(100.95);
  });

  test("meal rates drop to published 50% values at day 121", async () => {
    const meals = await dbService.getMealRates("canada", null, "commercial", 150);
    expect(meals.total).toBeCloseTo(60.65);
  });
});

describe("Appendix B kilometric rates", () => {
  test.each([
    ["ON", 0.655],
    ["BC", 0.63],
    ["SK", 0.58],
    ["YT", 0.73],
  ])("%s rate is %f per km", async (code, expected) => {
    const row = await dbService.getKilometricRate(code);
    expect(row.rate_per_km).toBeCloseTo(expected);
    expect(row.effective_date).toBe("2026-07-01");
  });
});

describe("accommodation limits", () => {
  test("table contains no JSON structure keys (prior corruption)", async () => {
    for (const junk of ["metadata", "cities", "internationalCities", "defaults"]) {
      const row = await dbService.getAccommodationRate(junk);
      expect(row).toBeNull();
    }
  });

  test("has full city coverage", async () => {
    const stats = await dbService.getStats();
    expect(stats.accommodations).toBeGreaterThanOrEqual(240);
    expect(stats.countries).toBeGreaterThanOrEqual(100);
  });

  test("Ottawa resolves with 12 monthly rates in CAD", async () => {
    const rate = await dbService.getAccommodationRate("ottawa");
    expect(rate.name).toMatch(/Ottawa/);
    expect(rate.accommodation.monthly).toHaveLength(12);
    expect(rate.accommodation_currency).toBe("CAD");
    expect(rate.meals.total).toBeCloseTo(121.25);
    expect(rate.incidentals).toBeCloseTo(25.0);
  });
});

describe("Appendix D international rates", () => {
  test("city-specific meal rates exist (Riga, Latvia)", async () => {
    const meals = await dbService.getMealRates(
      "international",
      "latvia_riga",
      "commercial",
      1
    );
    expect(meals).toBeDefined();
    expect(meals.total).toBeGreaterThan(0);
    expect(meals.currency).toBe("EUR");
  });
});

describe("weekend travel home allowances", () => {
  test("Canada two-day weekend matches published value", async () => {
    const row = await dbService.getWeekendAllowance("canada", 2);
    expect(row.allowance).toBeCloseTo(392.5);
  });
});
