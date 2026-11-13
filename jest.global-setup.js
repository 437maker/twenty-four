// Runs once before jest starts any test file.
// Pin the timezone so date tests mean the same thing on every machine
// (Sahil's laptop, a CI box in UTC, a reviewer's Mac in California).
module.exports = async () => {
  process.env.TZ = 'America/New_York';
};
