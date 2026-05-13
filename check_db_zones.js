const mongoose = require("mongoose");
require("dotenv").config();
const Zone = require("./src/models/zone.model");

async function checkZones() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI not found");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const zones = await Zone.find({ isActive: true }).lean();
    console.log("--- Active Zones in Database ---");
    console.log(JSON.stringify(zones, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkZones();
