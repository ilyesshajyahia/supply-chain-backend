const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });
const User = require("../backend/src/models/user.model");
const Zone = require("../backend/src/models/zone.model");

async function cleanup() {
  const mongoUri = process.env.MONGO_URI;
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Remove users from the old test org
    const userRes = await User.deleteMany({ orgId: "org-test-123" });
    console.log(`Deleted ${userRes.deletedCount} users from org-test-123`);

    // Remove the global zones I created
    const zoneRes = await Zone.deleteMany({ orgId: "org-test-123" });
    console.log(`Deleted ${zoneRes.deletedCount} global zones from org-test-123`);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

cleanup();
