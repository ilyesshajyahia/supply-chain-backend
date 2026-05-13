const mongoose=require('mongoose'); 
require('dotenv').config({path:'./.env'}); 
mongoose.connect(process.env.MONGO_URI).then(async ()=>{ 
  const orgId = 'org-test-123'; 
  const pipeline = [ 
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } }, 
    { $unwind: '$product' }, 
    { $match: { 'product.orgId': orgId, txHash: { $ne: null } } },
    { $project: { action: 1, gasUsed: { $toDouble: { $ifNull: ['$meta.gas.gasUsed', '$meta.lifecycleGas.gasUsed', '0'] } }, costEth: { $toDouble: { $ifNull: ['$meta.gas.costEth', '$meta.lifecycleGas.costEth', '0'] } } } },
    { $group: { _id: '$action', txCount: { $sum: 1 }, avgGasUsed: { $avg: '$gasUsed' }, avgCostEth: { $avg: '$costEth' }, totalCostEth: { $sum: '$costEth' } } },
    { $sort: { _id: 1 } }
  ]; 
  const rows = await mongoose.connection.db.collection('product_events').aggregate(pipeline).toArray(); 
  console.log(rows); 
  process.exit(0); 
}).catch(console.error);
