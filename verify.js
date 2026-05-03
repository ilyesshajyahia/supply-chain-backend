const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function verify() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const res = await mongoose.connection.db.collection('users').updateMany(
      { email: 'admin@test.com' },
      { $set: { emailVerified: true } }
    );
    console.log(res);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

verify();
