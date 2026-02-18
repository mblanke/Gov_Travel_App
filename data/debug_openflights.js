const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'openflights', 'airports.dat');

function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');
    console.log(`Loaded ${lines.length} lines.`);

    const yowLine = lines.find(l => l.includes('"YOW"'));
    if (yowLine) {
        console.log("Found YOW line:", yowLine);
        const parsed = parseCSVLine(yowLine);
        console.log("Parsed:", parsed);
        console.log("IATA (index 4):", parsed[4]);
    } else {
        console.log("YOW not found in file.");
    }

} catch (e) {
    console.error(e);
}
