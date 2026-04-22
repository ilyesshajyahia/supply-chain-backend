const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/db");
const { sweepAnchorsForAllOrgs } = require("./services/anchor.service");

(async function start() {
  await connectDatabase(env.mongoUri);
  app.listen(env.port, "0.0.0.0",() => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on http://localhost:${env.port}`);
  });

  if (env.l2Anchor.enabled) {
    const intervalMs = env.l2Anchor.sweepMinutes * 60 * 1000;
    setInterval(async () => {
      try {
        const summary = await sweepAnchorsForAllOrgs();
        // eslint-disable-next-line no-console
        console.log("Anchor sweep:", summary);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Anchor sweep failed:", err?.message || err);
      }
    }, intervalMs);
  }
})();
