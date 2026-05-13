const mongoose = require("mongoose");
const env = require("../src/config/env");

beforeAll(async () => {
  await mongoose.connect(env.mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
});
