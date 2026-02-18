const { generateFlights, loadAirports, loadRoutes } = require('../openFlightsService');
const fs = require('fs');

async function testFlightGeneration() {
    const results = {
        test1: null,
        test2: null,
        test3: null,
        logs: []
    };

    function log(msg) {
        results.logs.push(msg);
    }

    try {
        // Ensure data is loaded
        await loadAirports();
        await loadRoutes();

        // Test Case 1: Ottawa (YOW) to Munich (MUC)
        log("Running Test 1: YOW -> MUC");
        const flightsYOW_MUC = await generateFlights('YOW', 'MUC', '2025-06-01');
        results.test1 = flightsYOW_MUC;

        // Test Case 2: Ottawa (YOW) to London (LHR)
        log("Running Test 2: YOW -> LHR");
        const flightsYOW_LHR = await generateFlights('YOW', 'LHR', '2025-06-01');
        results.test2 = flightsYOW_LHR;

        // Test Case 3: Invalid Airport
        log("Running Test 3: Invalid Request");
        const flightsInvalid = await generateFlights('YOW', 'XYZ', '2025-06-01');
        results.test3 = flightsInvalid;

    } catch (e) {
        log("Error: " + e.message);
    }

    fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
}

testFlightGeneration();
