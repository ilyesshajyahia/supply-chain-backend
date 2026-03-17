# MongoDB Setup (supply_chain_app)

This folder contains a full MongoDB bootstrap script for your supply-chain project.

## Files

- `setup_supply_chain_app.mongosh.js`: Creates/updates collections, JSON Schema validators, indexes, and seed records.
- `examples/lifecycle_transaction_example.js`: Node.js example showing transaction-safe lifecycle update (`products` + `product_events`).

## 1) Run Database Bootstrap

```powershell
mongosh "mongodb+srv://<user>:<password>@<cluster-url>/admin" --file backend/mongodb/setup_supply_chain_app.mongosh.js
```

## 2) Verify Collections

```javascript
use supply_chain_app
show collections
```

Expected collections:

- `users`
- `zones`
- `products`
- `product_events`
- `scan_events`
- `counterfeit_flags`

## 3) Verify Indexes

```javascript
db.users.getIndexes()
db.zones.getIndexes()
db.products.getIndexes()
db.product_events.getIndexes()
db.scan_events.getIndexes()
db.counterfeit_flags.getIndexes()
```

## 4) Run Transaction Example (Optional)

```powershell
cd backend/mongodb/examples
npm init -y
npm i mongodb
$env:MONGODB_URI="mongodb+srv://<user>:<password>@<cluster-url>/supply_chain_app?retryWrites=true&w=majority"
node lifecycle_transaction_example.js
```

## Notes

- `role` enum currently allows both `reseller` and `distributor` to support naming variance.
- For strict consistency with your Flutter app, keep only one role naming model in all services.
