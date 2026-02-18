const service = require('../openFlightsService');

async function debug() {
    console.log("Loading airports from service...");
    try {
        const airports = await service.loadAirports();
        console.log(`Loaded count: ${Object.keys(airports).length}`);

        if (airports['YOW']) {
            console.log("YOW data:", airports['YOW']);
        } else {
            console.log("YOW NOT found in loaded data.");
        }

        if (airports['MUC']) {
            console.log("MUC found.");
        } else {
            console.log("MUC NOT found.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

debug();
