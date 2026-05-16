# Quick Start Guide - MammothBet Deployment

This is a condensed version of the deployment guide for quick reference.

## What You Need to Know

### ✅ **Oracle Price Updates** - AUTOMATED
The `mammoth-bet-server` automatically fetches prices from Coinbase and pushes them on-chain every 60 seconds.

### ✅ **Event Creation** - AUTOMATED
Rolling events are created automatically for all enabled currency pairs and durations (1 day, 1 week, 1 month).

### ✅ **Event Lifecycle** - AUTOMATED
Measurement start and event close are triggered automatically by the scheduler.

## System Architecture

```
┌────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│    Frontend    │───▶│  Backend (GQL)  │───▶│  Smart Contracts │
│    (Vue.js)    │    │    (DipDup)     │    │ Oracle/Wager/Pool│
└────────────────┘    └─────────────────┘    └──────────────────┘
                                                      ▲
                                                      │
                                              ┌───────┴────────┐
                                              │ mammoth-bet-   │
                                              │    server      │
                                              │ (Oracle+Events)│
                                              └────────────────┘
```

## Prerequisites Checklist

- [ ] Node.js v18+ installed
- [ ] Python 3.11+ installed (for DipDup)
- [ ] PostgreSQL 14+ running
- [ ] Wallet with testnet XTZ (for deploying contracts)
- [ ] Second wallet with testnet XTZ (for oracle/event operations)
- [ ] Private keys exported
- [ ] `.env` files created

## 10-Minute Setup

### 1. Deploy Contracts (3 min)

```bash
cd mammoth-bet-contracts
npm install

# Create .env
echo "PRIVATE_KEY=your_key" > .env

# Deploy in order
npm run deploy:etherlink:oracle    # Save ORACLE_ADDRESS
npm run deploy:etherlink:wager     # Save WAGER_ADDRESS
npm run deploy:etherlink:pool      # Save POOL_ADDRESS
```

### 2. Start Backend Indexer (3 min)

```bash
cd mammoth-bet-backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Edit dipdup.etherlink.yml with contract addresses
dipdup run
```

### 3. Start Server (2 min)

```bash
cd mammoth-bet-server
npm install

# Create .env
cat > .env << EOF
PRIVATE_KEY=your_operator_key
RPC_URL=https://node.ghostnet.etherlink.com
ORACLE_ADDRESS=0xYourOracleAddress
WAGER_ADDRESS=0xYourWagerAddress
EVENT_CREATION_ENABLED=true
EVENT_CHECK_INTERVAL_SEC=300
ENABLED_DURATIONS=1d,1w,1m
ENABLED_PAIRS=ETH-USD,BTC-USD,XTZ-USD
UPDATE_INTERVAL_SEC=60
BIND_PORT=8787
EOF

npm run build
npm start
```

### 4. Start Frontend (2 min)

```bash
cd mammoth-bet-frontend
yarn install

# Update src/services/config.js with contract addresses
yarn dev
```

## Environment Variables Reference

### mammoth-bet-server/.env

```env
# Required
PRIVATE_KEY=operator_private_key_without_0x
RPC_URL=https://node.ghostnet.etherlink.com
ORACLE_ADDRESS=0x...
WAGER_ADDRESS=0x...

# Oracle Settings
UPDATE_INTERVAL_SEC=60

# Event Creation Settings
EVENT_CREATION_ENABLED=true
EVENT_CHECK_INTERVAL_SEC=300
ENABLED_DURATIONS=1d,1w,1m
ENABLED_PAIRS=ETH-USD,BTC-USD,XTZ-USD

# Server
BIND_HOST=0.0.0.0
BIND_PORT=8787
EXPLORER_URL=https://shadownet.explorer.etherlink.com
```

## Quick Commands

### Check System Status

```bash
# Health check
curl http://localhost:8787/health

# View active events
curl http://localhost:8787/events/active

# View events summary
curl http://localhost:8787/events/summary

# Check scheduler status
curl http://localhost:8787/events/scheduler-status
```

### Manual Operations

```bash
# Trigger price update
curl -X POST http://localhost:8787/update

# Create single event
curl -X POST http://localhost:8787/events/create \
  -H "Content-Type: application/json" \
  -d '{"currencyPair": "ETH-USD", "duration": "1d"}'

# Create all missing events
curl -X POST http://localhost:8787/events/create-missing

# Run scheduler cycle manually
curl -X POST http://localhost:8787/events/run-scheduler
```

### Hardhat Console

```bash
cd mammoth-bet-contracts
npx hardhat console --network etherlink_testnet
```

```javascript
// Get contracts
const oracle = await ethers.getContractAt("PriceOracle", "ORACLE_ADDRESS");
const wager = await ethers.getContractAt("Wager", "WAGER_ADDRESS");

// Check prices
const [price, ts] = await oracle.getPrice("ETH-USD");
console.log("ETH-USD:", ethers.formatUnits(price, 8));

// Check events
const count = await wager.eventCounter();
console.log("Total events:", count);

// Get event details
const event = await wager.getEvent(0);
console.log("Event 0:", event);
```

## Event Duration Configuration

| Duration | Bets Open | Measurement |
|----------|-----------|-------------|
| 1 Day    | 23 hours  | 1 hour      |
| 1 Week   | 6 days    | 1 day       |
| 1 Month  | 29 days   | 1 day       |

## Deployment Order (Critical!)

```
1. PriceOracle     ──▶ No dependencies
       │
       ▼
2. Wager          ──▶ Requires Oracle
       │
       ▼
3. JusterPool     ──▶ Requires Wager
       │
       ▼
4. DipDup         ──▶ Indexes Wager & Oracle events
       │
       ▼
5. mammoth-bet-server ──▶ Requires Oracle & Wager addresses
       │
       ▼
6. Frontend       ──▶ Connects to GraphQL & contracts
```

## Network Info

| Parameter | Value |
|-----------|-------|
| Network | Etherlink Testnet |
| RPC | https://node.ghostnet.etherlink.com |
| Chain ID | 128123 |
| Explorer | https://shadownet.explorer.etherlink.com |
| Faucet | https://faucet.etherlink.com/ |

## Verification Checklist

After deployment, verify:

- [ ] Oracle prices updating (check `/health`)
- [ ] Events being created (check `/events/active`)
- [ ] Indexer syncing (check DipDup logs)
- [ ] Frontend loading events (open in browser)
- [ ] Wallet can connect (test MetaMask)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Oracle not updating | Check PRIVATE_KEY, RPC_URL |
| Events not creating | Check EVENT_CREATION_ENABLED=true |
| Frontend no events | Check GraphQL endpoint in config |
| "Insufficient funds" | Get XTZ from faucet |
| "Nonce too high" | Reset MetaMask activity |
| Indexer stuck | `dipdup schema wipe --force && dipdup run` |

## Cost Estimates (Monthly)

| Operation | Gas/call | Calls/month | Cost |
|-----------|----------|-------------|------|
| Oracle updates | ~100k | ~43,200 | ~0.4 ETH |
| Event creation | ~200k | ~9 | ~0.002 ETH |
| Measurement start | ~80k | ~9 | ~0.0007 ETH |
| Event close | ~100k | ~9 | ~0.0009 ETH |
| **Total** | | | **~0.5 ETH** |

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start dist/server.js --name mammothbet-server

# Monitor
pm2 monit

# View logs
pm2 logs mammothbet-server

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Using Docker

```bash
# Build
docker build -t mammothbet-server .

# Run
docker run -d \
  --name mammothbet-server \
  --env-file .env \
  -p 8787:8787 \
  mammothbet-server
```

## Support

- Full guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Architecture: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- Server automation: [mammoth-bet-server/AUTOMATION_GUIDE.md](../mammoth-bet-server/AUTOMATION_GUIDE.md)

---

**Remember:** Always test on testnet before mainnet! 🔒
