# MammothBet Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Contract Deployment](#contract-deployment)
5. [Backend Setup (DipDup Indexer)](#backend-setup-dipdup-indexer)
6. [Server Setup (Oracle & Events)](#server-setup-oracle--events)
7. [Frontend Deployment](#frontend-deployment)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Automation Configuration](#automation-configuration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

MammothBet is a decentralized prediction market platform built on Etherlink. This guide covers the complete deployment process for all components:

- **Smart Contracts**: PriceOracle, Wager, JusterPool
- **Backend Indexer**: DipDup (indexes blockchain events to PostgreSQL)
- **Server**: Oracle price updates + Event creation automation
- **Frontend**: Vue.js application

### Automation Status

| Component | Automation Status | Description |
|-----------|-------------------|-------------|
| Oracle Prices | **AUTOMATED** | Prices pushed on-chain every 60 seconds |
| Event Creation | **AUTOMATED** | Rolling events created automatically |
| Event Lifecycle | **AUTOMATED** | Measurement start & close triggered automatically |

---

## Prerequisites

### Required Software

```bash
# Node.js (v18+)
node --version  # Should be 18.x or higher

# Python (3.11+)
python --version  # Should be 3.11.x

# PostgreSQL (14+)
psql --version

# Docker (optional, for containerized deployment)
docker --version
```

### Required Accounts

- **Wallet**: MetaMask or compatible EVM wallet with testnet XTZ
- **Etherlink Testnet Faucet**: https://faucet.etherlink.com/
- **Coinbase API** (optional): For price feeds

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MAMMOTHBET SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐   │
│  │  Frontend   │────▶│   Backend   │────▶│     Smart Contracts     │   │
│  │   (Vue.js)  │     │  (DipDup)   │     │  Oracle/Wager/Pool      │   │
│  └─────────────┘     └─────────────┘     └─────────────────────────┘   │
│        │                   │                        ▲                   │
│        │                   │                        │                   │
│        │                   ▼                        │                   │
│        │             ┌─────────────┐     ┌─────────────────────────┐   │
│        └────────────▶│  GraphQL    │     │   mammoth-bet-server    │   │
│                      │  (Hasura)   │     │  (Oracle + Events)      │   │
│                      └─────────────┘     └─────────────────────────┘   │
│                            │                        │                   │
│                            ▼                        ▼                   │
│                      ┌─────────────┐     ┌─────────────────────────┐   │
│                      │ PostgreSQL  │     │    Coinbase API         │   │
│                      └─────────────┘     │    (Price Feed)         │   │
│                                          └─────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Contract Deployment

### Step 1: Setup

```bash
cd mammoth-bet-contracts
npm install

# Create .env file
cp .env.example .env
```

Edit `.env`:

```env
# Required
PRIVATE_KEY=your_private_key_without_0x
ETHERLINK_TESTNET_RPC=https://node.ghostnet.etherlink.com

# Optional (for verification)
ETHERSCAN_API_KEY=your_api_key
```

### Step 2: Deploy Contracts

Deploy in order (dependencies matter):

```bash
# 1. Deploy Oracle
npm run deploy:etherlink:oracle

# Save the ORACLE_ADDRESS from output!
# Add to .env: ORACLE_ADDRESS=0x...

# 2. Deploy Wager (requires Oracle)
npm run deploy:etherlink:wager

# Save the WAGER_ADDRESS from output!
# Add to .env: WAGER_ADDRESS=0x...

# 3. Deploy Pool (requires Wager)
npm run deploy:etherlink:pool

# Save the POOL_ADDRESS from output!
```

### Step 3: Configure Oracle

Add supported currency pairs:

```bash
npx hardhat console --network etherlink_testnet

# In console:
const oracle = await ethers.getContractAt("PriceOracle", "YOUR_ORACLE_ADDRESS")
await oracle.addPair("ETH-USD")
await oracle.addPair("BTC-USD")
await oracle.addPair("XTZ-USD")
```

---

## Backend Setup (DipDup Indexer)

### Step 1: Setup Python Environment

```bash
cd mammoth-bet-backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# OR: .venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure DipDup

Edit `dipdup.etherlink.yml`:

```yaml
datasources:
  etherlink_node:
    kind: evm.node
    url: https://node.ghostnet.etherlink.com
    ws_url: wss://node.ghostnet.etherlink.com

contracts:
  wager:
    address: "YOUR_WAGER_ADDRESS"
    typename: Wager
  
  oracle:
    address: "YOUR_ORACLE_ADDRESS"
    typename: PriceOracle
```

### Step 3: Setup Database

```bash
# Create PostgreSQL database
createdb mammothbet

# Or using Docker:
docker run -d \
  --name mammothbet-postgres \
  -e POSTGRES_DB=mammothbet \
  -e POSTGRES_USER=mammothbet \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:14
```

### Step 4: Run Indexer

```bash
# Development
dipdup run

# Production (with Hasura)
dipdup -c dipdup.etherlink.yml -c configs/dipdup.hasura.yml run
```

---

## Server Setup (Oracle & Events)

The `mammoth-bet-server` handles:
1. **Oracle Price Updates**: Fetches prices from Coinbase and pushes on-chain
2. **Event Creation**: Automatically creates rolling events (1d, 1w, 1m)
3. **Event Lifecycle**: Triggers measurement start and event close

### Step 1: Setup

```bash
cd mammoth-bet-server
npm install

# Create .env file
cp .env.example .env
```

### Step 2: Configure Environment

Edit `.env`:

```env
# RPC Configuration
RPC_URL=https://node.ghostnet.etherlink.com
CHAIN_ID=128123
EXPLORER_URL=https://shadownet.explorer.etherlink.com

# Authentication
PRIVATE_KEY=your_private_key_without_0x

# Oracle Configuration
ORACLE_ADDRESS=0xYourOracleAddress
UPDATE_INTERVAL_SEC=60

# Event Creation (AUTOMATED)
WAGER_ADDRESS=0xYourWagerAddress
EVENT_CREATION_ENABLED=true
EVENT_CHECK_INTERVAL_SEC=300

# Event Configuration
ENABLED_DURATIONS=1d,1w,1m
ENABLED_PAIRS=ETH-USD,BTC-USD,XTZ-USD

# Server
BIND_HOST=0.0.0.0
BIND_PORT=8787
```

### Step 3: Run Server

```bash
# Development
npm run dev

# Production
npm run build
npm run start

# Or with PM2 (recommended for production)
pm2 start dist/server.js --name mammothbet-server
```

### Step 4: Verify Automation

```bash
# Check health
curl http://localhost:8787/health

# Check event creation config
curl http://localhost:8787/events/config

# Check active events
curl http://localhost:8787/events/active

# Check scheduler status
curl http://localhost:8787/events/scheduler-status
```

---

## Frontend Deployment

### Step 1: Setup

```bash
cd mammoth-bet-frontend
yarn install
```

### Step 2: Configure

Edit `src/services/config.js`:

```javascript
// Contract addresses
export const contracts = {
  testnet: {
    oracle: "0xYourOracleAddress",
    wager: "0xYourWagerAddress",
    pool: "0xYourPoolAddress",
  },
}

// DipDup GraphQL endpoints
export const dipdup = {
  testnet: {
    graphq: "http://localhost:8080/v1/graphql",
    ws: "ws://localhost:8080/v1/graphql",
  },
}
```

### Step 3: Build & Deploy

```bash
# Development
yarn dev

# Production build
yarn build

# Preview production build
yarn preview

# Deploy to hosting (Vercel, Netlify, etc.)
# The dist/ folder contains the built files
```

---

## Post-Deployment Verification

### 1. Check Contracts

```bash
npx hardhat console --network etherlink_testnet

# Check Oracle
const oracle = await ethers.getContractAt("PriceOracle", "ORACLE_ADDRESS")
console.log("Admin:", await oracle.admin())
console.log("ETH-USD supported:", await oracle.supportsPair("ETH-USD"))

# Check Wager
const wager = await ethers.getContractAt("Wager", "WAGER_ADDRESS")
console.log("Event count:", await wager.eventCounter())
console.log("Oracle:", await wager.oracle())
```

### 2. Check Server

```bash
# Health check
curl http://localhost:8787/health

# Events summary
curl http://localhost:8787/events/summary

# Should show active events for each duration/pair combination
```

### 3. Check Indexer

```bash
# Query GraphQL (Hasura)
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ events { id status currencyPair { symbol } } }"}'
```

### 4. Check Frontend

1. Open http://localhost:3000
2. Connect wallet
3. Verify events are displayed
4. Check that prices are updating

---

## Automation Configuration

### Event Duration Settings

| Duration | Bets Close After | Measurement Period |
|----------|------------------|-------------------|
| 1 Day    | 23 hours         | 1 hour            |
| 1 Week   | 6 days           | 1 day             |
| 1 Month  | 29 days          | 1 day             |

### Rolling Events

The system maintains active events for each enabled pair and duration combination:

- 3 pairs × 3 durations = **9 events** maximum active at once
- New events are created automatically when current ones close
- Scheduler checks every 5 minutes (configurable)

### Cost Estimates

| Operation | Gas | Cost (approx) |
|-----------|-----|---------------|
| Oracle price update (3 pairs) | ~100,000 | ~0.001 ETH |
| Event creation | ~200,000 | ~0.002 ETH |
| Start measurement | ~80,000 | ~0.0008 ETH |
| Close event | ~100,000 | ~0.001 ETH |

**Monthly estimate**: ~0.5-1 ETH (depending on gas prices)

---

## Troubleshooting

### Oracle Not Updating

```bash
# Check server logs
pm2 logs mammothbet-server

# Manual update
curl -X POST http://localhost:8787/update

# Check price in contract
npx hardhat console --network etherlink_testnet
const oracle = await ethers.getContractAt("PriceOracle", "ORACLE_ADDRESS")
const [price, timestamp] = await oracle.getPrice("ETH-USD")
console.log("ETH-USD:", ethers.formatUnits(price, 8), "at", new Date(Number(timestamp) * 1000))
```

### Events Not Creating

```bash
# Check event creation is enabled
curl http://localhost:8787/events/config

# Check scheduler status
curl http://localhost:8787/events/scheduler-status

# Force create missing events
curl -X POST http://localhost:8787/events/create-missing

# Manual event creation
curl -X POST http://localhost:8787/events/create \
  -H "Content-Type: application/json" \
  -d '{"currencyPair": "ETH-USD", "duration": "1d"}'
```

### Indexer Issues

```bash
# Check DipDup logs
dipdup run

# Reset and reindex
dipdup schema wipe --force
dipdup run
```

### Frontend Not Loading Events

1. Check GraphQL endpoint in config
2. Verify Hasura is running
3. Check browser console for errors
4. Verify events exist in database

---

## Maintenance

### Daily Tasks

- Monitor server logs for errors
- Check that prices are updating
- Verify events are being created

### Weekly Tasks

- Review gas usage
- Check wallet balance
- Review event statistics

### Monthly Tasks

- Update dependencies
- Review and optimize gas costs
- Backup database

---

## Quick Reference

### Contract Addresses (Testnet)

| Contract | Address |
|----------|---------|
| Oracle | `0x...` |
| Wager | `0x...` |
| Pool | `0x...` |

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /update` | Manual price update |
| `GET /events/config` | Event creation config |
| `GET /events/summary` | Events overview |
| `GET /events/active` | List active events |
| `POST /events/create` | Create event manually |
| `POST /events/create-missing` | Create all missing events |
| `POST /events/run-scheduler` | Run scheduler cycle |

---

## Support

- **GitHub Issues**: [mammothbet/issues](https://github.com/mammothbet/issues)
- **Documentation**: This guide
- **Community**: Discord/Telegram (if applicable)
