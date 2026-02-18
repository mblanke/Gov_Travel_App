/**
 * AI Voice Agent for Government Travel App
 * Uses Web Speech API for recognition and heuristic NLP for intent parsing
 */

let recognition = null;
let isListening = false;
let finalTranscript = "";

// Initialize Speech Recognition
function initSpeechRecognition() {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Stop after one command for simplicity
        recognition.interimResults = true;
        recognition.lang = "en-CA"; // Default to Canadian English

        recognition.onstart = () => {
            isListening = true;
            document.getElementById("voiceStatus").textContent = "Listening...";
            document.getElementById("voiceStatus").style.color = "#60a5fa";
            document.getElementById("voiceAgentBtn").classList.add("listening");
            document.getElementById("voiceOverlay").style.display = "flex";
            finalTranscript = "";
        };

        recognition.onresult = (event) => {
            let interimTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            document.getElementById("voiceTranscript").textContent =
                finalTranscript + interimTranscript;
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            stopVoiceAgent();
            alert("Voice recognition error: " + event.error);
        };

        recognition.onend = () => {
            isListening = false;
            document.getElementById("voiceAgentBtn").classList.remove("listening");

            if (finalTranscript.trim().length > 0) {
                processVoiceCommand(finalTranscript);
            } else {
                // If silence, just close overlay
                closeOverlay();
            }
        };
    } else {
        alert("Sorry, your browser does not support voice recognition. Please use Chrome or Edge.");
    }
}

// Toggle Voice Agent
function toggleVoiceAgent() {
    if (!recognition) initSpeechRecognition();

    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function stopVoiceAgent() {
    if (recognition) recognition.stop();
    closeOverlay();
}

function closeOverlay() {
    document.getElementById("voiceOverlay").style.display = "none";
}

/**
 * Process the transcribed text using heuristic NLP
 */
function processVoiceCommand(text) {
    document.getElementById("voiceStatus").textContent = "Thinking...";
    document.getElementById("voiceStatus").style.color = "#34d399";

    setTimeout(() => {
        const intent = parseTripIntent(text);
        applyIntentToForm(intent);
        closeOverlay();

        // Speak confirmation
        if (intent.destination) {
            speakResponse(`I've set up your trip to ${intent.destination}.`);
        } else {
            speakResponse("I didn't catch the destination. Please try again.");
        }
    }, 800);
}

/**
 * Parse natural language text into trip details
 * Regex patterns to extract: Origin, Destination, Dates, Mode
 */
function parseTripIntent(text) {
    const lowerText = text.toLowerCase();
    console.log("Parsing voice command:", lowerText);

    const result = {
        origin: null,
        destination: null,
        departureDate: null,
        returnDate: null,
        transportMode: null
    };

    // 1. Extract Origin
    // "from Ottawa", "leaving Ottawa", "departing Ottawa"
    const originMatch = lowerText.match(/(?:from|leaving|departing)\s+([a-zA-Z\s.]+)(?:\s+to|\s+on|\s+next|\s+returning|$)/);
    if (originMatch) result.origin = capitalizeCity(originMatch[1].trim());

    // 2. Extract Destination
    // "to Munich", "visiting Munich", "fly to Munich"
    // Note: Handle "from X to Y" correctly by ensuring we don't capture "to Y" inside X
    const destMatch = lowerText.match(/(?:to|visiting)\s+([a-zA-Z\s.]+)(?:\s+on|\s+from|\s+next|\s+returning|$)/);
    if (destMatch) result.destination = capitalizeCity(destMatch[1].trim());

    // 3. Extract Transport Mode
    if (lowerText.includes("flight") || lowerText.includes("fly") || lowerText.includes("flying")) {
        result.transportMode = "flight";
    } else if (lowerText.includes("drive") || lowerText.includes("driving") || lowerText.includes("car")) {
        result.transportMode = "vehicle";
    } else if (lowerText.includes("train") || lowerText.includes("rail")) {
        result.transportMode = "train";
    }

    // 4. Extract Dates (Simple Heuristics)
    // "on June 1st", "leaving tomorrow"
    const today = new Date();

    // "Next Monday", "Next Friday" logic
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    // Detect "next [day]"
    for (let i = 0; i < daysOfWeek.length; i++) {
        if (lowerText.includes(`next ${daysOfWeek[i]}`)) {
            const nextDay = getNextDay(i);
            result.departureDate = nextDay.toISOString().split('T')[0];

            // Default return: +7 days later if not specified
            const ret = new Date(nextDay);
            ret.setDate(ret.getDate() + 7);
            result.returnDate = ret.toISOString().split('T')[0];
            break; // Stop after first date found
        }
    }

    // Detect simple months "June 1st", "June 10"
    // This is a naive parser; a library like Chrono.js would be better but "No API/Libs" constraint
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    months.forEach((month, idx) => {
        if (lowerText.includes(month)) {
            // Look for number after month
            const dateRegex = new RegExp(`${month}\\s+(\\d+)(?:st|nd|rd|th)?`);
            const match = lowerText.match(dateRegex);
            if (match) {
                const day = parseInt(match[1]);
                const year = today.getFullYear(); // Assume current year
                // If month is earlier than current month, maybe next year? (Skipping for simplicity)
                const d = new Date(year, idx, day);
                result.departureDate = d.toISOString().split('T')[0];

                // Default return: +7 days
                const ret = new Date(d);
                ret.setDate(ret.getDate() + 7);
                result.returnDate = ret.toISOString().split('T')[0];
            }
        }
    });

    // "Returning in X days/weeks"
    // TODO: Add more complex date parsing strategies if needed

    return result;
}

/**
 * Apply parsed intent to the form
 */
function applyIntentToForm(intent) {
    if (intent.origin) {
        document.getElementById("departureCity").value = intent.origin;
        // Trigger validation if possible (assuming script.js functions are global, but simpler to just set value)
        // Ideally call: selectCity(intent.origin, 'departureCity') if exposed
    }

    if (intent.destination) {
        document.getElementById("destinationCity").value = intent.destination;
        // Smart guess for destination type
        const intDest = intent.destination.toLowerCase();
        const typeSelect = document.getElementById("destinationType");

        if (["ottawa", "toronto", "montreal", "vancouver", "calgary", "halifax"].includes(intDest)) {
            typeSelect.value = "canada";
        } else if (["new york", "washington", "florida", "california"].includes(intDest)) {
            typeSelect.value = "usa";
        } else {
            typeSelect.value = "international"; // Default safe guess
        }
    }

    if (intent.departureDate) document.getElementById("departureDate").value = intent.departureDate;
    if (intent.returnDate) document.getElementById("returnDate").value = intent.returnDate;

    if (intent.transportMode) {
        document.getElementById("transportMode").value = intent.transportMode;
        // Trigger change event to show correct fields
        document.getElementById("transportMode").dispatchEvent(new Event('change'));
    }
}

// Helper: Get next occurrence of a day index (0=Sun, 6=Sat)
function getNextDay(dayIndex) {
    const d = new Date();
    d.setDate(d.getDate() + (dayIndex + 7 - d.getDay()) % 7);
    // If today is the day, move to next week
    if (d.toDateString() === new Date().toDateString()) {
        d.setDate(d.getDate() + 7);
    }
    return d;
}

function capitalizeCity(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

function speakResponse(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-CA";
        window.speechSynthesis.speak(utterance);
    }
}
