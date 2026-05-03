# ChainTrace Backend

The backend system powering the ChainTrace platform, built with Node.js, Express, and MongoDB.

## Features

- **Auth & RBAC**: JWT-based authentication with strict role enforcement (Org Admins, Manufacturers, Distributors, Resellers).
- **Blockchain Integration**: Merkle tree L2-to-L1 anchoring system for batching supply chain events, reducing gas costs.
- **Geofencing & Analytics**: Validates scans against predefined organizational boundaries and aggregates gas metrics.
- **File Management**: Automated chat attachment lifecycle (30-day retention).

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas cluster)
- An active `RESEND_API_KEY` or `MAILTRAP_API_KEY` for email sending.
- Infura or another RPC provider for L1 transactions.

### Environment Setup

Create a `.env` file in the `backend/` directory using the following template:

```env
# Server
PORT=4000
NODE_ENV=development

# Database
MONGO_URI=mongodb://127.0.0.1:27017/chaintrace
JWT_SECRET=super_secret_jwt_key

# Email
RESEND_API_KEY=re_your_api_key

# Blockchain
L1_RPC_URL=https://sepolia.infura.io/v3/your_project_id
L1_CHAIN_ID=11155111
L2_ANCHOR_ENABLED=true

# Security
FAIL_CLOSED_GEOFENCE=true
BLOCK_EXPLORER_URL=https://testnet.routescan.io
```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

## Testing

Run the automated regression test suite using Jest:
```bash
npm test
```
