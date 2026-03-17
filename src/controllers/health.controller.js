const asyncHandler = require("../utils/asyncHandler");

const health = asyncHandler(async (_req, res) => {
  res.json({ ok: true, message: "Backend healthy", timestamp: new Date().toISOString() });
});

module.exports = { health };
