const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Product = require('./src/models/product.model');
const ProductEvent = require('./src/models/productEvent.model');
const User = require('./src/models/user.model');
const crypto = require('crypto');

async function seedDashboard() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const orgId = "org-test-123";
    
    // Get some products to attach events to
    const products = await Product.find({ orgId }).limit(50);
    if (products.length === 0) {
      console.log("No products found for org-test-123. Run seed.js first.");
      process.exit(1);
    }

    const adminUser = await User.findOne({ orgId, email: "admin@test.com" });
    if (!adminUser) {
      console.log("Admin user not found");
      process.exit(1);
    }

    console.log("Creating mock ProductEvents for dashboard...");
    await ProductEvent.deleteMany({ "meta.mock": true });

    const eventsToInsert = [];
    const actions = ["created", "transferred_to_reseller", "transferred_to_distributor", "sold"];
    
    for (let i = 0; i < 200; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      // Random date within last 7 days
      const date = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
      
      // Mock gas values
      const gasUsed = Math.floor(Math.random() * 50000) + 21000;
      const costEth = (gasUsed * (Math.random() * 20 + 10)) / 1e9; // simulated gwei price
      
      // Some events will be unanchored to show up in "Pending Anchor Events"
      const isAnchored = Math.random() > 0.3; // 30% pending

      eventsToInsert.push({
        productId: product._id,
        qrId: product.qrId,
        action: action,
        byUserId: adminUser._id,
        byRole: "manufacturer",
        location: {
          type: "Point",
          coordinates: [ -122.4194 + (Math.random() * 0.1), 37.7749 + (Math.random() * 0.1) ]
        },
        txHash: isAnchored ? `0x${crypto.randomBytes(32).toString('hex')}` : null,
        actorAddress: `0x${crypto.randomBytes(20).toString('hex')}`,
        meta: {
          mock: true,
          gas: isAnchored ? {
            gasUsed: gasUsed,
            costEth: costEth
          } : undefined
        },
        timestamp: date,
        createdAt: date,
        updatedAt: date
      });
    }

    await ProductEvent.insertMany(eventsToInsert);
    console.log(`Inserted ${eventsToInsert.length} mock events.`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seedDashboard();
