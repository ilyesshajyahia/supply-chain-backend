/* eslint-disable no-undef */
// Run with:
// mongosh "mongodb+srv://<user>:<password>@<cluster-url>/admin" --file backend/mongodb/setup_supply_chain_app.mongosh.js

const dbName = "supply_chain_app";
const targetDb = db.getSiblingDB(dbName);

function createOrUpdateCollection(collectionName, validator) {
  const exists = targetDb.getCollectionInfos({ name: collectionName }).length > 0;
  if (!exists) {
    targetDb.createCollection(collectionName, {
      validator,
      validationLevel: "strict",
      validationAction: "error",
    });
    print(`Created collection: ${collectionName}`);
    return;
  }

  targetDb.runCommand({
    collMod: collectionName,
    validator,
    validationLevel: "strict",
    validationAction: "error",
  });
  print(`Updated validator: ${collectionName}`);
}

const roleEnum = [
  "manufacturer",
  "retailer",
  "reseller",
  "distributor",
  "customer",
];

const statusEnum = [
  "at_manufacturer",
  "at_retailer",
  "at_reseller",
  "at_distributor",
  "sold",
  "suspicious",
];

const actionEnum = [
  "created",
  "transferred_to_retailer",
  "transferred_to_reseller",
  "transferred_to_distributor",
  "sold",
  "status_marked_suspicious",
];

createOrUpdateCollection("users", {
  $jsonSchema: {
    bsonType: "object",
    required: ["email", "name", "role", "orgId", "isActive", "createdAt", "updatedAt"],
    properties: {
      email: {
        bsonType: "string",
        description: "must be a valid email",
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
      },
      name: { bsonType: "string", minLength: 2 },
      role: { enum: roleEnum },
      orgId: { bsonType: "string", minLength: 1 },
      isActive: { bsonType: "bool" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
});

createOrUpdateCollection("zones", {
  $jsonSchema: {
    bsonType: "object",
    required: ["orgId", "role", "name", "geometry", "isActive", "createdAt"],
    properties: {
      orgId: { bsonType: "string", minLength: 1 },
      role: { enum: roleEnum },
      name: { bsonType: "string", minLength: 2 },
      geometry: {
        bsonType: "object",
        required: ["type", "coordinates"],
        properties: {
          type: { enum: ["Polygon"] },
          coordinates: { bsonType: "array", minItems: 1 },
        },
      },
      isActive: { bsonType: "bool" },
      createdAt: { bsonType: "date" },
    },
  },
});

createOrUpdateCollection("products", {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "qrId",
      "orgId",
      "name",
      "status",
      "currentOwnerRole",
      "isSold",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      qrId: { bsonType: "string", minLength: 1 },
      orgId: { bsonType: "string", minLength: 1 },
      name: { bsonType: "string", minLength: 1 },
      status: { enum: statusEnum },
      currentOwnerRole: { enum: roleEnum },
      isSold: { bsonType: "bool" },
      soldAt: { bsonType: ["date", "null"] },
      lastTxHash: { bsonType: ["string", "null"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
});

createOrUpdateCollection("product_events", {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "productId",
      "qrId",
      "action",
      "byUserId",
      "byRole",
      "location",
      "timestamp",
    ],
    properties: {
      productId: { bsonType: "objectId" },
      qrId: { bsonType: "string", minLength: 1 },
      action: { enum: actionEnum },
      byUserId: { bsonType: "objectId" },
      byRole: { enum: roleEnum },
      location: {
        bsonType: "object",
        required: ["type", "coordinates"],
        properties: {
          type: { enum: ["Point"] },
          coordinates: {
            bsonType: "array",
            minItems: 2,
            maxItems: 2,
            items: { bsonType: "double" },
          },
        },
      },
      txHash: { bsonType: ["string", "null"] },
      blockNumber: { bsonType: ["long", "int", "null"] },
      timestamp: { bsonType: "date" },
      meta: { bsonType: ["object", "null"] },
    },
  },
});

createOrUpdateCollection("scan_events", {
  $jsonSchema: {
    bsonType: "object",
    required: ["qrId", "scanType", "location", "result", "timestamp"],
    properties: {
      productId: { bsonType: ["objectId", "null"] },
      qrId: { bsonType: "string", minLength: 1 },
      scanType: { enum: ["public", "internal"] },
      scannedByUserId: { bsonType: ["objectId", "null"] },
      location: {
        bsonType: "object",
        required: ["type", "coordinates"],
        properties: {
          type: { enum: ["Point"] },
          coordinates: {
            bsonType: "array",
            minItems: 2,
            maxItems: 2,
            items: { bsonType: "double" },
          },
        },
      },
      result: {
        enum: [
          "verified",
          "unknown_qr",
          "duplicate_scan_after_sold",
          "outside_authorized_zone",
          "denied_role",
        ],
      },
      timestamp: { bsonType: "date" },
    },
  },
});

createOrUpdateCollection("counterfeit_flags", {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "productId",
      "qrId",
      "reason",
      "severity",
      "firstDetectedAt",
      "scanEventIds",
      "isOpen",
    ],
    properties: {
      productId: { bsonType: "objectId" },
      qrId: { bsonType: "string", minLength: 1 },
      reason: {
        enum: [
          "duplicate_scan_after_sold",
          "invalid_transition_attempt",
          "multi_region_scan_pattern",
          "manual_report",
        ],
      },
      severity: { enum: ["low", "medium", "high", "critical"] },
      firstDetectedAt: { bsonType: "date" },
      scanEventIds: {
        bsonType: "array",
        items: { bsonType: "objectId" },
      },
      isOpen: { bsonType: "bool" },
      resolvedAt: { bsonType: ["date", "null"] },
      resolutionNote: { bsonType: ["string", "null"] },
    },
  },
});

// Indexes
targetDb.users.createIndex({ email: 1 }, { unique: true, name: "ux_users_email" });
targetDb.products.createIndex({ qrId: 1 }, { unique: true, name: "ux_products_qrId" });
targetDb.products.createIndex(
  { orgId: 1, status: 1 },
  { name: "ix_products_orgId_status" }
);

targetDb.product_events.createIndex(
  { productId: 1, timestamp: -1 },
  { name: "ix_product_events_productId_timestamp" }
);
targetDb.product_events.createIndex(
  { qrId: 1, timestamp: -1 },
  { name: "ix_product_events_qrId_timestamp" }
);
targetDb.product_events.createIndex(
  { location: "2dsphere" },
  { name: "ix_product_events_location_2dsphere" }
);

targetDb.zones.createIndex({ geometry: "2dsphere" }, { name: "ix_zones_geometry_2dsphere" });

targetDb.scan_events.createIndex(
  { productId: 1, timestamp: -1 },
  { name: "ix_scan_events_productId_timestamp" }
);
targetDb.scan_events.createIndex(
  { qrId: 1, timestamp: -1 },
  { name: "ix_scan_events_qrId_timestamp" }
);
targetDb.scan_events.createIndex(
  { location: "2dsphere" },
  { name: "ix_scan_events_location_2dsphere" }
);

targetDb.counterfeit_flags.createIndex(
  { productId: 1, isOpen: 1 },
  { name: "ix_counterfeit_flags_productId_isOpen" }
);
targetDb.counterfeit_flags.createIndex(
  { qrId: 1, isOpen: 1, firstDetectedAt: -1 },
  { name: "ix_counterfeit_flags_qrId_isOpen_firstDetectedAt" }
);

print("Indexes ensured.");

// Minimal seed data
const now = new Date();
const manufacturerUserId = new ObjectId();
const retailerUserId = new ObjectId();
const resellerUserId = new ObjectId();
const productId = new ObjectId();

targetDb.users.updateOne(
  { email: "mfg@chaintrace.app" },
  {
    $set: {
      _id: manufacturerUserId,
      email: "mfg@chaintrace.app",
      name: "Factory Operator",
      role: "manufacturer",
      orgId: "org_001",
      isActive: true,
      updatedAt: now,
    },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true }
);

targetDb.users.updateOne(
  { email: "ret@chaintrace.app" },
  {
    $set: {
      _id: retailerUserId,
      email: "ret@chaintrace.app",
      name: "Retail Receiver",
      role: "retailer",
      orgId: "org_001",
      isActive: true,
      updatedAt: now,
    },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true }
);

targetDb.users.updateOne(
  { email: "res@chaintrace.app" },
  {
    $set: {
      _id: resellerUserId,
      email: "res@chaintrace.app",
      name: "Reseller Agent",
      role: "reseller",
      orgId: "org_001",
      isActive: true,
      updatedAt: now,
    },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true }
);

targetDb.zones.updateOne(
  { orgId: "org_001", role: "manufacturer", name: "Factory Zone Casablanca" },
  {
    $set: {
      orgId: "org_001",
      role: "manufacturer",
      name: "Factory Zone Casablanca",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-7.62, 33.56],
            [-7.56, 33.56],
            [-7.56, 33.60],
            [-7.62, 33.60],
            [-7.62, 33.56],
          ],
        ],
      },
      isActive: true,
    },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true }
);

targetDb.products.updateOne(
  { qrId: "QR-DEMO-0001" },
  {
    $set: {
      _id: productId,
      qrId: "QR-DEMO-0001",
      orgId: "org_001",
      name: "Demo Product",
      status: "at_manufacturer",
      currentOwnerRole: "manufacturer",
      isSold: false,
      soldAt: null,
      lastTxHash: null,
      updatedAt: now,
    },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true }
);

targetDb.product_events.updateOne(
  { qrId: "QR-DEMO-0001", action: "created" },
  {
    $setOnInsert: {
      productId,
      qrId: "QR-DEMO-0001",
      action: "created",
      byUserId: manufacturerUserId,
      byRole: "manufacturer",
      location: { type: "Point", coordinates: [-7.5898, 33.5731] },
      txHash: null,
      blockNumber: null,
      timestamp: now,
      meta: { note: "Bootstrap seed event" },
    },
  },
  { upsert: true }
);

print(`MongoDB bootstrap finished for database: ${dbName}`);
