const path = require("path");

// Loads the repository's .env into process.env for these operational scripts.
// Variables that are already set win, so CI and shell exports take precedence.
const loadEnv = (file = path.join(__dirname, "..", "..", ".env")) => {
  try {
    process.loadEnvFile(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

module.exports = { loadEnv };
