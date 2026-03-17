const Zone = require("../models/zone.model");

async function isInAuthorizedZone({ orgId, role, longitude, latitude, session }) {
  const zone = await Zone.findOne({
    orgId,
    role,
    isActive: true,
    geometry: {
      $geoIntersects: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
    },
  })
    .session(session || null)
    .lean();

  return Boolean(zone);
}

module.exports = { isInAuthorizedZone };
