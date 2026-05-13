const mongoose=require('mongoose'); 
require('dotenv').config({path:'./.env'}); 
mongoose.connect(process.env.MONGO_URI).then(async ()=>{ 
  const orgId = 'org-test-123'; 
  const pipeline = [ 
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } }, 
    { $unwind: '$product' }, 
    { $match: { 'product.orgId': orgId, txHash: { $ne: null } } } 
  ]; 
  const rows = await mongoose.connection.db.collection('product_events').aggregate(pipeline).toArray(); 
  console.log("Matched events:", rows.length); 
  process.exit(0); 
}).catch(console.error);
