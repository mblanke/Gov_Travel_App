/**
 * Integration tests for Government Travel App API endpoints
 * Run with: npm test
 */
const request = require("supertest");
const app = require("../server");

// Hardcoded dates rot: validation rejects past dates, so derive from today
function futureDate(daysAhead) {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

afterAll(() => {
  // Give the server listener time to close
  return new Promise((resolve) => setTimeout(resolve, 500));
});

describe("Health Check", () => {
  test("GET /api/health returns healthy status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "healthy");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("database");
  });
});

describe("Static Pages", () => {
  test("GET / serves main page", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  test("GET /validation serves validation page", async () => {
    const res = await request(app).get("/validation");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });
});

describe("Accommodation API", () => {
  test("GET /api/accommodation/search returns 404 for unknown city", async () => {
    const res = await request(app)
      .get("/api/accommodation/search")
      .query({ city: "NowhereVille" });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "City not found");
  });

  test("GET /api/accommodation/rate returns rate data", async () => {
    const res = await request(app)
      .get("/api/accommodation/rate")
      .query({ city: "Ottawa" });
    expect(res.status).toBe(200);
  });
});

describe("City Search APIs", () => {
  test("GET /api/autocomplete returns city suggestions object", async () => {
    const res = await request(app)
      .get("/api/autocomplete")
      .query({ q: "Ott" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("suggestions");
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  });

  test("GET /api/regions returns region list", async () => {
    const res = await request(app).get("/api/regions");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("regions");
    expect(Array.isArray(res.body.regions)).toBe(true);
  });

  test("GET /api/countries returns country list", async () => {
    const res = await request(app).get("/api/countries");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("countries");
    expect(Array.isArray(res.body.countries)).toBe(true);
  });
});

describe("Flight Search API", () => {
  test("GET /api/flights/search returns results or sample data", async () => {
    const res = await request(app)
      .get("/api/flights/search")
      .query({
        origin: "Ottawa",
        destination: "Vancouver",
        departureDate: futureDate(30),
        returnDate: futureDate(34),
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("flights");
    expect(Array.isArray(res.body.flights)).toBe(true);
  });
});

describe("404 Handler", () => {
  test("GET /nonexistent returns 404", async () => {
    const res = await request(app).get("/api/nonexistent-endpoint");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});
