// Run every test in a timezone behind UTC, where the local calendar date and
// the UTC date differ every evening, so date handling cannot pass by accident
// on a machine that happens to run in UTC.
module.exports = () => {
  process.env.TZ = 'America/Los_Angeles';
};
