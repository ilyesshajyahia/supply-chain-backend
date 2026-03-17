const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const healthRoute = require("./routes/health.route");
const authRoute = require("./routes/auth.route");
const productRoute = require("./routes/product.route");
const scanRoute = require("./routes/scan.route");
const zoneRoute = require("./routes/zone.route");
const orgRoute = require("./routes/org.route");
const { notFound, errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use("/api/v1/health", healthRoute);
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/scans", scanRoute);
app.use("/api/v1/zones", zoneRoute);
app.use("/api/v1/org", orgRoute);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
