const Zone = require("../models/zone.model");

async function getActiveZones({ role, orgId }) {
  const query = { isActive: true };
  if (role) query.role = role;
  if (orgId) query.orgId = orgId;

  return Zone.find(query).sort({ createdAt: -1 }).lean();
}

module.exports = { getActiveZones };

