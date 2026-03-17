const asyncHandler = require("../utils/asyncHandler");
const zoneService = require("../services/zone.service");

const listActive = asyncHandler(async (req, res) => {
  const role = req.query.role;
  const orgId = req.query.orgId;

  const data = await zoneService.getActiveZones({ role, orgId });
  res.json({ ok: true, data });
});

module.exports = { listActive };

