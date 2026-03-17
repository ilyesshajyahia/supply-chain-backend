const mongoose = require("mongoose");

async function connectDatabase(mongoUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
  return mongoose.connection;
}

module.exports = { connectDatabase };
