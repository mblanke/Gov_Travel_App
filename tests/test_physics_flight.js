const { generateFlights, loadAirports, loadRoutes } = require('../openFlightsService');

async function testFlightGeneration() {
    console.log("Starting Flight Generation Test...");

    // Ensure data is loaded
    const airports = await loadAirports();
    console.log(`Loaded ${Object.keys(airports).length} airports.`);

    if (airports['YOW']) console.log("YOW found in loaded map.");
    else console.log("YOW NOT found in loaded map.");

    if (airports['MUC']) console.log("MUC found in loaded map.");
    else console.log("MUC NOT found in loaded map.");

    await loadRoutes();

    // Test Case 1: Ottawa (YOW) to Munich (MUC)
    // Distance: ~6000 km
    // Expected Duration: ~7.5 - 9.0 hours (Direct)
    const flightsYOW_MUC = await generateFlights('YOW', 'MUC', '2025-06-01');

    if (flightsYOW_MUC && flightsYOW_MUC.length > 0) {
        console.log(`\nGenerated ${flightsYOW_MUC.length} flights for YOW -> MUC`);
        flightsYOW_MUC.forEach((f, i) => {
            console.log(`Flight ${i + 1}: ${f.carrier} | ${f.durationHours}h | Stops: ${f.stops} | Price: $${f.price}`);
        });

        const firstFlight = flightsYOW_MUC[0];
        if (firstFlight.durationHours >= 7 && firstFlight.durationHours <= 9.5) {
            console.log("PASS: Duration is realistic.");
        } else {
            console.log("FAIL: Duration is outside expected range (7-9.5h).");
        }
    } else {
        console.log("FAIL: No flights generated for YOW -> MUC");
    }

    // Test Case 2: Ottawa (YOW) to London (LHR)
    // Distance: ~5300 km
    // Expected Duration: ~6.5 - 8.0 hours
    const flightsYOW_LHR = await generateFlights('YOW', 'LHR', '2025-06-01');

    if (flightsYOW_LHR && flightsYOW_LHR.length > 0) {
        console.log(`\nGenerated ${flightsYOW_LHR.length} flights for YOW -> LHR`);
        flightsYOW_LHR.forEach((f, i) => {
            console.log(`Flight ${i + 1}: ${f.carrier} | ${f.durationHours}h | Stops: ${f.stops} | Price: $${f.price}`);
        });
        const firstFlight = flightsYOW_LHR[0];
        if (firstFlight.durationHours >= 6 && firstFlight.durationHours <= 8.5) {
            console.log("PASS: Duration is realistic.");
        } else {
            console.log("FAIL: Duration is outside expected range (6-8.5h).");
        }
    } else {
        console.log("FAIL: No flights generated for YOW -> LHR");
    }

    // Test Case 3: Invalid Airport
    const flightsInvalid = await generateFlights('YOW', 'XYZ', '2025-06-01');
    if (flightsInvalid === null) {
        console.log("\nPASS: Invalid airport returns null.");
    } else {
        console.log("\nFAIL: Invalid airport returned data.");
    }

}

testFlightGeneration();
