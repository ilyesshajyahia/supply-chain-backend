const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/db");

(async function start() {
  await connectDatabase(env.mongoUri);
  app.listen(env.port, "0.0.0.0",() => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on http://localhost:${env.port}`);
  });
})();
