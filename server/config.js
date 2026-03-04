require('dotenv').config();

function optional(name, fallback) {
  return process.env[name] || fallback;
}

module.exports = {
  port: parseInt(optional('PORT', '3003'), 10),
  dbPath: optional('DB_PATH', './data/hubspot.db'),
  hubspotApiToken: optional('HUBSPOT_API_TOKEN', ''),
};
