// Node.js example: transaction-safe lifecycle transition for MongoDB.
// npm i mongodb
// node backend/mongodb/examples/lifecycle_transaction_example.js

const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Set MONGODB_URI before running this script.");
}

const client = new MongoClient(uri);
const dbName = "supply_chain_app";

async function transferToRetailer({
  qrId,
  byUserId,
  longitude,
  latitude,
  txHash = null,
  blockNumber = null,
}) {
  await client.connect();
  const session = client.startSession();
  const db = client.db(dbName);

  try {
    await session.withTransaction(async () => {
      const users = db.collection("users");
      const products = db.collection("products");
      const productEvents = db.collection("product_events");

      const actor = await users.findOne(
        { _id: new ObjectId(byUserId), role: "retailer", isActive: true },
        { session }
      );
      if (!actor) throw new Error("Actor is not an active retailer.");

      const product = await products.findOne({ qrId }, { session });
      if (!product) throw new Error("Product not found.");
      if (product.isSold) throw new Error("Product already sold; immutable.");
      if (product.currentOwnerRole !== "manufacturer") {
        throw new Error("Invalid state transition. Expected manufacturer ownership.");
      }

      const now = new Date();
      await products.updateOne(
        { _id: product._id, currentOwnerRole: "manufacturer", isSold: false },
        {
          $set: {
            status: "at_retailer",
            currentOwnerRole: "retailer",
            lastTxHash: txHash,
            updatedAt: now,
          },
        },
        { session }
      );

      await productEvents.insertOne(
        {
          productId: product._id,
          qrId,
          action: "transferred_to_retailer",
          byUserId: actor._id,
          byRole: "retailer",
          location: { type: "Point", coordinates: [longitude, latitude] },
          txHash,
          blockNumber,
          timestamp: now,
          meta: { source: "api" },
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
    await client.close();
  }
}

if (require.main === module) {
  transferToRetailer({
    qrId: "QR-DEMO-0001",
    byUserId: "000000000000000000000001",
    longitude: -6.8416,
    latitude: 34.0209,
  })
    .then(() => console.log("Transaction complete."))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
}

