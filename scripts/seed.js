const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const crypto = require("crypto");

// Models
const Product = require("../src/models/product.model");
const User = require("../src/models/user.model");
// Assuming there might be an Org model, but we will just use a dummy orgId.

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI not found in .env");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully.");

    // Define mock data parameters
    const orgId = "org-test-123";
    const batchPrefix = "B-2026-";
    
    // Clear old test data (optional)
    console.log("Clearing old seed data...");
    await Product.deleteMany({ orgId });
    await User.deleteMany({ orgId });

    // 1. Create Test Users
    console.log("Creating test users...");
    const testUsers = [
      {
        email: "admin@test.com",
        password: "password123", // In a real app this would be hashed, but this is a mock seed
        role: "manufacturer",
        orgId: orgId,
        name: "Admin User",
        isActive: true,
        isOrgAdmin: true
      },
      {
        email: "distributor@test.com",
        password: "password123",
        role: "distributor",
        orgId: orgId,
        name: "Global Distributor Inc.",
        isActive: true,
        isOrgAdmin: false
      },
      {
        email: "reseller@test.com",
        password: "password123",
        role: "reseller",
        orgId: orgId,
        name: "Local Reseller Shop",
        isActive: false, // Leave pending to test approval feature
        isOrgAdmin: false
      }
    ];
    
    for (const u of testUsers) {
      // Create user document manually to bypass hooks if any or let model handle it
      await User.create(u).catch(e => console.log(`User ${u.email} already exists or error:`, e.message));
    }

    // 2. Create Test Products and Batches
    console.log("Seeding massive product database...");
    
    const productsToInsert = [];
    const statuses = ["at_manufacturer", "at_distributor", "at_reseller", "sold", "suspicious"];
    
    // Create 10 batches, each with 50 products = 500 products
    for (let batchIdx = 1; batchIdx <= 10; batchIdx++) {
      const batchNumber = `${batchPrefix}${batchIdx.toString().padStart(3, '0')}`;
      
      // Randomly make one batch quarantined
      const batchStatus = batchIdx === 3 ? "quarantined" : "active";
      const batchReason = batchIdx === 3 ? "Auto-quarantine: Exceeded 30% counterfeit report threshold from resellers." : null;

      for (let prodIdx = 1; prodIdx <= 50; prodIdx++) {
        const qrId = crypto.randomUUID();
        // Randomly pick status
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        productsToInsert.push({
          qrId: qrId,
          productIdOnChain: Math.floor(Math.random() * 100000).toString(),
          orgId: orgId,
          name: `Premium Product V${batchIdx}`,
          brand: "ChainTrace Corp",
          category: "Electronics",
          status: status,
          currentOwnerRole: status === "at_distributor" ? "distributor" : status === "at_reseller" ? "reseller" : "manufacturer",
          batchNumber: batchNumber,
          batchStatus: batchStatus,
          batchFlagReason: batchReason,
        });
      }
    }

    // Insert in chunks
    console.log(`Inserting ${productsToInsert.length} products into the database...`);
    await Product.insertMany(productsToInsert);

    console.log(`\n✅ Seeding Complete!`);
    console.log(`Created test organization: ${orgId}`);
    console.log(`Created 3 test users (1 admin, 1 distributor, 1 pending reseller)`);
    console.log(`Created 500 test products across 10 batches.`);
    console.log(`Note: Batch ${batchPrefix}003 is pre-quarantined for testing public scan warnings.\n`);

    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();
