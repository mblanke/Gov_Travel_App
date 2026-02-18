/**
 * Unit tests for flightService
 */
const { getAirportCode, searchFlights } = require("../flightService");

describe("getAirportCode", () => {
  test("returns correct code for Ottawa", () => {
    expect(getAirportCode("Ottawa")).toBe("YOW");
  });

  test("returns correct code for Vancouver", () => {
    expect(getAirportCode("Vancouver")).toBe("YVR");
  });

  test("returns correct code for Canberra", () => {
    expect(getAirportCode("Canberra")).toBe("CBR");
  });

  test("is case-insensitive", () => {
    expect(getAirportCode("LONDON")).toBe("LHR");
    expect(getAirportCode("london")).toBe("LHR");
    expect(getAirportCode("London")).toBe("LHR");
  });

  test("returns null for unknown city", () => {
    expect(getAirportCode("FakeCity123")).toBeNull();
  });

  test("handles multi-word cities", () => {
    expect(getAirportCode("New York")).toBe("JFK");
    expect(getAirportCode("Los Angeles")).toBe("LAX");
    expect(getAirportCode("San Francisco")).toBe("SFO");
  });
});

describe("searchFlights", () => {
  test("returns flight data (live or sample fallback)", async () => {
    const result = await searchFlights("YOW", "YVR", "2026-06-01", "2026-06-05");
    expect(result).toBeDefined();
    expect(result).toHaveProperty("flights");
    expect(Array.isArray(result.flights)).toBe(true);
    expect(result.flights.length).toBeGreaterThan(0);
  }, 15000);

  test("flight results include price info", async () => {
    const result = await searchFlights("YOW", "LHR", "2026-06-01", "2026-06-05");
    const flight = result.flights[0];
    expect(flight).toHaveProperty("price");
    expect(flight).toHaveProperty("currency");
  }, 15000);

  test("sample flight results include layover details", async () => {
    const result = await searchFlights("YOW", "LHR", "2026-06-01", "2026-06-05");
    // Find a flight with stops
    const flightWithStops = result.flights.find(f => f.stops > 0);
    expect(flightWithStops).toBeDefined();
    expect(flightWithStops).toHaveProperty("layovers");
    expect(Array.isArray(flightWithStops.layovers)).toBe(true);
    expect(flightWithStops.layovers.length).toBeGreaterThan(0);
    const layover = flightWithStops.layovers[0];
    expect(layover).toHaveProperty("airport");
    expect(layover).toHaveProperty("city");
    expect(layover).toHaveProperty("layoverMinutes");
    expect(typeof layover.layoverMinutes).toBe("number");
  }, 15000);
});
