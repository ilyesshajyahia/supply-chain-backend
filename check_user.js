const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });
const User = require("../backend/src/models/user.model");

async function checkUser() {
  const mongoUri = process.env.MONGO_URI;
  try {
    await mongoose.connect(mongoUri);
    const user = await User.findOne({ email: "admin@test.com" }).lean();
    console.log("--- User admin@test.com ---");
    console.log(JSON.stringify(user, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkUser();
