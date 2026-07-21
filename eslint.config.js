const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "eqeqeq": ["warn", "always"],
      "curly": ["warn", "multi-line"],
      "no-var": "warn",
      "prefer-const": "warn",
    },
  },
  // Browser globals for frontend files (now in public/)
  {
    files: ["public/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    // Cross-file globals: defined in voiceAgent.js, referenced from script.js
    files: ["public/script.js"],
    languageOptions: {
      globals: {
        stopVoiceAgent: "readonly",
        toggleVoiceAgent: "readonly",
      },
    },
  },
  // Ignore patterns
  {
    ignores: [
      "node_modules/",
      "dist/",
      "logs/",
      ".venv/",
      "*.min.js",
      "Gov_Travel_App/",
      // Dead files (scheduled for cleanup)
      "original_script.js",
      "script_old.js",
      "script_66b72d5.js",
      "extract_cities.js",
      "extract_cities2.js",
      "extract_canadian.js",
      // One-off inspection scripts (not production code). scripts/migrate.js
      // IS production tooling and is linted.
      "scripts/check*.js",
      "scripts/listCountries.js",
      "scripts/testCanberraAPI.js",
      "scripts/testCompleteTravelRates.js",
      "scripts/testDatabase.js",
    ],
  },
];
