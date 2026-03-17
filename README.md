# Supply Chain Backend (Express)

Express + MongoDB + Ethers backend for your Flutter app.

## Quick start

1. Copy env file:
   - `cp .env.example .env` (or create manually on Windows)
2. Install deps:
   - `npm install`
3. Start dev server:
   - `npm run dev`

Default API base URL: `http://localhost:4000/api/v1`

## Endpoints

- `GET /health`
- `POST /products/register` (manufacturer)
- `POST /products/transfer` (retailer/reseller)
- `POST /products/finalize-sale` (reseller)
- `GET /products/:qrId/history` (public)
- `POST /scans/public` (public)

## Auth model used in this scaffold

This scaffold uses `x-user-id` header and resolves user from MongoDB.
Replace with JWT/Auth provider in production.

## Important contract note

Your contracts authorize by `msg.sender`. Since backend sends transactions from one signer wallet,
that signer must be granted the needed on-chain roles, or contract design must be adjusted for relaying/delegation.
