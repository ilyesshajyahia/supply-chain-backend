const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { requestId } = require("./middlewares/requestId.middleware");

const healthRoute = require("./routes/health.route");
const authRoute = require("./routes/auth.route");
const productRoute = require("./routes/product.route");
const scanRoute = require("./routes/scan.route");
const zoneRoute = require("./routes/zone.route");
const orgRoute = require("./routes/org.route");
const publicRoute = require("./routes/public.route");
const { notFound, errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(requestId);
morgan.token("reqId", (req) => req.id || "-");
app.use(morgan("[:date[iso]] :reqId :method :url :status - :response-time ms"));

app.use("/api/v1/health", healthRoute);
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/scans", scanRoute);
app.use("/api/v1/zones", zoneRoute);
app.use("/api/v1/org", orgRoute);
app.use("/public", publicRoute);

app.get("/", (_req, res) => {
  res.status(200).send("ChainTrace backend is running");
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
