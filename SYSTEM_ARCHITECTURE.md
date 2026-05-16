# MammothBet System Architecture & Flow Diagrams

This document provides visual representations of the MammothBet system architecture and workflows.

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Event Lifecycle Flow](#event-lifecycle-flow)
4. [Event Creation Flow (Automated)](#event-creation-flow-automated)
5. [Oracle Update Flow](#oracle-update-flow)
6. [User Betting Flow](#user-betting-flow)
7. [Liquidity Pool Flow](#liquidity-pool-flow)
8. [Data Flow](#data-flow)
9. [Deployment Flow](#deployment-flow)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MAMMOTHBET SYSTEM                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐        ┌──────────────────┐
│                  │         │                  │        │                  │
│   END USERS      │◄────────┤   FRONTEND       │────────┤  WALLET          │
│                  │         │   (Vue.js)       │        │  (MetaMask)      │
│   - Bettors      │         │                  │        │                  │
│   - LP Providers │         │  - Event UI      │        │  - Sign Txs      │
│                  │         │  - Place Bets    │        │  - Manage Keys   │
│                  │         │  - Dashboards    │        │                  │
│                  │         │                  │        │                  │
└──────────────────┘         └────────┬─────────┘        └──────────────────┘
                                      │
                          ┌───────────┴───────────┐
                          │                       │
                          ▼                       ▼
                   ┌──────────────┐      ┌──────────────────┐
                   │   GraphQL    │      │   Web3 RPC       │
                   │   (Hasura)   │      │   (Etherlink)    │
                   └──────┬───────┘      └────────┬─────────┘
                          │                       │
                          │                       │
┌─────────────────────────┼───────────────────────┼──────────────────────────┐
│         BACKEND LAYER   │                       │                          │
│                         │                       │                          │
│  ┌──────────────────────▼─────┐   ┌─────────────▼──────────────────────┐  │
│  │     DipDup Indexer         │   │     mammoth-bet-server             │  │
│  │                            │   │                                     │  │
│  │  - Index blockchain events │   │  - Oracle price updates (auto)     │  │
│  │  - Store in PostgreSQL     │   │  - Event creation (auto)           │  │
│  │  - Expose via Hasura       │   │  - Event lifecycle management      │  │
│  └────────────┬───────────────┘   │  - HTTP API for monitoring         │  │
│               │                   └──────────────┬──────────────────────┘  │
│               ▼                                  │                          │
│  ┌────────────────────────────┐                 │                          │
│  │      PostgreSQL            │                 │                          │
│  │  - Events, Bets, Users     │                 │                          │
│  │  - Positions, Withdrawals  │                 │                          │
│  └────────────────────────────┘                 │                          │
│                                                  │                          │
└──────────────────────────────────────────────────┼──────────────────────────┘
                                                   │
                                                   │ createEvent(), setPrices()
                                                   │
┌──────────────────────────────────────────────────┼──────────────────────────┐
│         BLOCKCHAIN LAYER (Etherlink)             │                          │
│                                                   │                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────▼──┐                       │
│  │ PriceOracle  │  │    Wager     │  │   Pool      │                       │
│  │              │◄─┤              │  │             │                       │
│  │ - Set Prices │  │ - Events     │  │ - LP Tokens │                       │
│  │ - Get Prices │  │ - Bets       │  │ - Deposits  │                       │
│  │ - Callbacks  │──▶ - Liquidity  │  │ - Rewards   │                       │
│  │              │  │ - Settlement │  │             │                       │
│  └──────────────┘  └──────────────┘  └─────────────┘                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                                   ▲
                                                   │
                                                   │ REST API
                                      ┌────────────┴────────────┐
                                      │                         │
                                      │    COINBASE API         │
                                      │    (Price Feed)         │
                                      │                         │
                                      │    - BTC-USD            │
                                      │    - ETH-USD            │
                                      │    - XTZ-USD            │
                                      │                         │
                                      └─────────────────────────┘
```

---

## Component Architecture

### Detailed Component Breakdown

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COMPONENT LAYERS                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: PRESENTATION (Frontend)                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  mammoth-bet-frontend/                                                   │
│  ├── src/                                                                │
│  │   ├── views/             (Page components)                            │
│  │   ├── components/        (UI components)                              │
│  │   │   ├── base/          (Base components)                            │
│  │   │   ├── modules/       (Feature modules)                            │
│  │   │   └── ui/            (UI elements)                                │
│  │   ├── services/          (Web3 & API interactions)                    │
│  │   │   └── sdk/           (FlameWager SDK)                             │
│  │   ├── api/               (GraphQL API calls)                          │
│  │   │   ├── events.js      (Event queries)                              │
│  │   │   ├── markets.js     (Market queries)                             │
│  │   │   ├── users.js       (User queries)                               │
│  │   │   └── positions.js   (Position queries)                           │
│  │   ├── graphql/           (GraphQL models)                             │
│  │   ├── store/             (Vuex state)                                 │
│  │   └── composable/        (Vue composables)                            │
│  │                                                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: AUTOMATION (mammoth-bet-server)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  mammoth-bet-server/                                                     │
│  ├── src/                                                                │
│  │   ├── services/                                                       │
│  │   │   ├── updater.ts         (Oracle price updates)                   │
│  │   │   ├── scheduler.ts       (Price update scheduler)                 │
│  │   │   ├── eventCreator.ts    (Event creation logic)                   │
│  │   │   ├── eventScheduler.ts  (Event scheduler - rolling events)       │
│  │   │   └── prices.ts          (Coinbase price fetching)                │
│  │   ├── abis/                                                           │
│  │   │   ├── oracle.ts          (Oracle ABI)                             │
│  │   │   └── wager.ts           (Wager ABI)                              │
│  │   ├── web/                                                            │
│  │   │   └── routes.ts          (HTTP API endpoints)                     │
│  │   ├── clients/                                                        │
│  │   │   └── viemClient.ts      (Blockchain client)                      │
│  │   └── utils/                                                          │
│  │       └── config.ts          (Configuration)                          │
│  │                                                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: INDEXER (DipDup)                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  mammoth-bet-backend/                                                    │
│  ├── src/mammoth_bet/                                                    │
│  │   ├── handlers/              (Event handlers)                         │
│  │   │   ├── wager/             (Wager event handlers)                   │
│  │   │   │   ├── on_event_created.py                                     │
│  │   │   │   ├── on_bet_placed.py                                        │
│  │   │   │   └── on_event_closed.py                                      │
│  │   │   └── oracle/            (Oracle event handlers)                  │
│  │   │       └── on_price_updated.py                                     │
│  │   └── models.py              (SQLAlchemy models)                      │
│  ├── dipdup.etherlink.yml       (DipDup config)                          │
│  └── hasura/                    (Hasura metadata)                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: SMART CONTRACTS                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  mammoth-bet-contracts/                                                  │
│  ├── contracts/                                                          │
│  │   ├── main/                                                           │
│  │   │   ├── oracle.sol         (Price Oracle)                           │
│  │   │   ├── wager.sol          (Betting Contract)                       │
│  │   │   └── pool.sol           (Liquidity Pool)                         │
│  │   ├── interfaces/            (Contract interfaces)                    │
│  │   └── partial/               (Shared types & libraries)               │
│  │                                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Event Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EVENT LIFECYCLE                                   │
└─────────────────────────────────────────────────────────────────────────┘

           ┌──────────────────────────────────────────────────────┐
           │                                                      │
           │   1. EVENT CREATION (Automated by mammoth-bet-server)│
           │                                                      │
           │      ┌─────────────────────────────────────────┐    │
           │      │  Event Scheduler checks for missing      │    │
           │      │  events every 5 minutes                   │    │
           │      └─────────────────┬───────────────────────┘    │
           │                        │                             │
           │                        ▼                             │
           │      ┌─────────────────────────────────────────┐    │
           │      │  createEvent() called on Wager contract  │    │
           │      │  - currencyPair (ETH-USD, BTC-USD, etc.) │    │
           │      │  - betsCloseTime                         │    │
           │      │  - measurePeriod                         │    │
           │      └─────────────────────────────────────────┘    │
           │                                                      │
           └──────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   2. BETTING PERIOD (Users place bets)                                  │
│                                                                          │
│      STATUS: NEW                                                         │
│      Duration: Configurable (23h for 1d, 6d for 1w, 29d for 1m)        │
│                                                                          │
│   ┌────────────────┐     ┌────────────────┐     ┌────────────────┐     │
│   │                │     │                │     │                │     │
│   │  Bet AboveEq   │     │   Bet Below    │     │   Provide      │     │
│   │  (Price Up)    │     │  (Price Down)  │     │   Liquidity    │     │
│   │                │     │                │     │                │     │
│   └───────┬────────┘     └───────┬────────┘     └───────┬────────┘     │
│           │                      │                      │               │
│           └──────────────────────┼──────────────────────┘               │
│                                  │                                       │
│                                  ▼                                       │
│                    ┌──────────────────────────┐                         │
│                    │     Pools Updated        │                         │
│                    │  - poolAboveEq           │                         │
│                    │  - poolBelow             │                         │
│                    │  - totalLiquidityShares  │                         │
│                    └──────────────────────────┘                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ betsCloseTime reached
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   3. MEASUREMENT START (Automated by mammoth-bet-server)                │
│                                                                          │
│      STATUS: BETS_CLOSED → MEASUREMENT_STARTED                          │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │  Event Scheduler detects event with status BETS_CLOSED            │ │
│   │  ↓                                                                 │ │
│   │  Calls startMeasurement(eventId)                                  │ │
│   │  ↓                                                                 │ │
│   │  Oracle callback provides startRate                               │ │
│   │  ↓                                                                 │ │
│   │  measureOracleStartTime recorded                                  │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ measurePeriod elapsed
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   4. EVENT CLOSE (Automated by mammoth-bet-server)                      │
│                                                                          │
│      STATUS: MEASUREMENT_STARTED → CLOSED                               │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │  Event Scheduler detects measurePeriod has elapsed                │ │
│   │  ↓                                                                 │ │
│   │  Calls closeEvent(eventId)                                        │ │
│   │  ↓                                                                 │ │
│   │  Oracle callback provides closedRate                              │ │
│   │  ↓                                                                 │ │
│   │  Calculate: closedDynamics = closedRate * 10000 / startRate      │ │
│   │  ↓                                                                 │ │
│   │  Determine winner: closedDynamics >= targetDynamics ?             │ │
│   │                    AboveEq wins : Below wins                      │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   5. WITHDRAWAL PERIOD (Users claim winnings)                           │
│                                                                          │
│      STATUS: CLOSED                                                      │
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │                                                                │    │
│   │  Winners can call withdraw(eventId) to claim:                  │    │
│   │  - Original bet amount                                         │    │
│   │  - Share of losing pool (proportional to bet size)             │    │
│   │                                                                │    │
│   │  Liquidity providers can claim:                                │    │
│   │  - Original liquidity                                          │    │
│   │  - Share of fees                                               │    │
│   │                                                                │    │
│   └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Event Creation Flow (Automated)

```
┌─────────────────────────────────────────────────────────────────────────┐
│               AUTOMATED EVENT CREATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────────────────────────┐
         │                   mammoth-bet-server                         │
         │                                                              │
         │   ┌──────────────────────────────────────────────────────┐  │
         │   │             EVENT SCHEDULER SERVICE                   │  │
         │   │                                                       │  │
         │   │    startEventScheduler(config)                        │  │
         │   │         │                                             │  │
         │   │         ▼                                             │  │
         │   │    ┌─────────────────────────────────────────┐       │  │
         │   │    │  Every 5 minutes (EVENT_CHECK_INTERVAL) │       │  │
         │   │    └────────────────────┬────────────────────┘       │  │
         │   │                         │                             │  │
         │   │                         ▼                             │  │
         │   │    ┌─────────────────────────────────────────┐       │  │
         │   │    │  runSchedulerCycle(config)              │       │  │
         │   │    │                                          │       │  │
         │   │    │  1. Get active events from contract      │       │  │
         │   │    │  2. Check for events needing measurement │       │  │
         │   │    │  3. Check for events needing close       │       │  │
         │   │    │  4. Check for missing events             │       │  │
         │   │    │  5. Create missing events                │       │  │
         │   │    └─────────────────────────────────────────┘       │  │
         │   │                                                       │  │
         │   └──────────────────────────────────────────────────────┘  │
         │                                                              │
         └──────────────────────────────────────────────────────────────┘
                                       │
                                       │ For each missing event
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           CREATE EVENT                                    │
│                                                                          │
│    ┌───────────────────────────────────────────────────────────────┐    │
│    │                                                                │    │
│    │   Enabled Pairs: ETH-USD, BTC-USD, XTZ-USD                    │    │
│    │                                                                │    │
│    │   Enabled Durations:                                          │    │
│    │   ┌─────────┬─────────────────┬─────────────────┐            │    │
│    │   │ Duration│ Bets Close      │ Measure Period  │            │    │
│    │   ├─────────┼─────────────────┼─────────────────┤            │    │
│    │   │ 1d      │ 23 hours        │ 1 hour          │            │    │
│    │   │ 1w      │ 6 days          │ 1 day           │            │    │
│    │   │ 1m      │ 29 days         │ 1 day           │            │    │
│    │   └─────────┴─────────────────┴─────────────────┘            │    │
│    │                                                                │    │
│    │   Total: 3 pairs × 3 durations = 9 events max                 │    │
│    │                                                                │    │
│    └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
│    ┌───────────────────────────────────────────────────────────────┐    │
│    │  createEventWithDuration(config, duration, currencyPair)      │    │
│    │                                                                │    │
│    │  1. Calculate event parameters:                                │    │
│    │     - betsCloseTime = now + betsCloseDuration                 │    │
│    │     - measurePeriod = duration config                          │    │
│    │     - targetDynamics = 10000 (100%)                           │    │
│    │     - liquidityPercent = 2000 (20%)                           │    │
│    │                                                                │    │
│    │  2. Get required fee from contract config                      │    │
│    │                                                                │    │
│    │  3. Call Wager.createEvent() with fee                         │    │
│    │                                                                │    │
│    └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ Transaction sent
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        WAGER CONTRACT                                     │
│                                                                          │
│    createEvent(currencyPair, targetDynamics, betsCloseTime,             │
│                measurePeriod, liquidityPercent)                          │
│                                                                          │
│    ┌───────────────────────────────────────────────────────────────┐    │
│    │  1. Validate parameters                                        │    │
│    │  2. Verify fee payment                                         │    │
│    │  3. Create event record                                        │    │
│    │  4. Emit EventCreated event                                    │    │
│    └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ EventCreated emitted
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        DIPDUP INDEXER                                     │
│                                                                          │
│    on_event_created handler                                              │
│                                                                          │
│    ┌───────────────────────────────────────────────────────────────┐    │
│    │  1. Parse event data                                           │    │
│    │  2. Create Event record in PostgreSQL                          │    │
│    │  3. Create/update CurrencyPair record                          │    │
│    │  4. Create Creator user record                                 │    │
│    └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ Available via GraphQL
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                          │
│                                                                          │
│    Events displayed in UI                                                │
│                                                                          │
│    ┌───────────────────────────────────────────────────────────────┐    │
│    │  fetchEventsByStatus({ status: "NEW" })                       │    │
│    │                                                                │    │
│    │  Returns:                                                      │    │
│    │  - ETH-USD 1d event                                           │    │
│    │  - ETH-USD 1w event                                           │    │
│    │  - ETH-USD 1m event                                           │    │
│    │  - BTC-USD 1d event                                           │    │
│    │  - ... etc                                                     │    │
│    └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Oracle Update Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ORACLE UPDATE FLOW                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  mammoth-bet-server                                                      │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                PRICE UPDATER SERVICE                            │    │
│  │                                                                  │    │
│  │    scheduleAutoUpdater(config)                                  │    │
│  │         │                                                        │    │
│  │         ▼                                                        │    │
│  │    Every 60 seconds (UPDATE_INTERVAL_SEC)                       │    │
│  │         │                                                        │    │
│  │         ▼                                                        │    │
│  │    ┌─────────────────────────────────────────────────────┐     │    │
│  │    │  updateOnce(config, pairs)                          │     │    │
│  │    │                                                      │     │    │
│  │    │  1. Fetch prices from Coinbase                      │     │    │
│  │    │     - GET /v2/prices/BTC-USD/spot                   │     │    │
│  │    │     - GET /v2/prices/ETH-USD/spot                   │     │    │
│  │    │     - GET /v2/prices/XTZ-USD/spot                   │     │    │
│  │    │                                                      │     │    │
│  │    │  2. Format prices (8 decimal places)                │     │    │
│  │    │                                                      │     │    │
│  │    │  3. Push on-chain                                   │     │    │
│  │    │     Oracle.setPrices(pairs, prices)                 │     │    │
│  │    └─────────────────────────────────────────────────────┘     │    │
│  │                                                                  │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ setPrices transaction
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  PriceOracle Contract                                                    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  setPrices(pairs[], prices[])                                   │    │
│  │                                                                  │    │
│  │  For each pair:                                                 │    │
│  │    1. Validate pair is supported                                │    │
│  │    2. Update price in storage                                   │    │
│  │    3. Update lastUpdate timestamp                               │    │
│  │    4. Emit PriceUpdated event                                   │    │
│  │                                                                  │    │
│  │  Storage:                                                        │    │
│  │    prices[pair] = Price { value: uint256, lastUpdate: uint256 }│    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ PriceUpdated events
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  DipDup Indexer                                                          │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  on_price_updated handler                                       │    │
│  │                                                                  │    │
│  │  1. Parse price data                                            │    │
│  │  2. Update CurrencyPair.currentPrice                           │    │
│  │  3. Create PriceUpdate record                                   │    │
│  │  4. Store in PostgreSQL                                         │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## User Betting Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER BETTING FLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

    USER                    FRONTEND                  CONTRACT
      │                        │                         │
      │  1. View Events        │                         │
      │ ────────────────────▶ │                         │
      │                        │                         │
      │                        │  fetchEventsByStatus()  │
      │                        │ ◀─────────────────────▶│
      │                        │     (via GraphQL)       │
      │                        │                         │
      │  2. Select Event &     │                         │
      │     Choose Side        │                         │
      │ ────────────────────▶ │                         │
      │                        │                         │
      │  3. Enter Amount       │                         │
      │ ────────────────────▶ │                         │
      │                        │                         │
      │  4. Confirm Bet        │                         │
      │ ────────────────────▶ │                         │
      │                        │                         │
      │                        │  placeBet(eventId,      │
      │                        │           betType,      │
      │                        │           minWinAmount) │
      │                        │ ─────────────────────▶ │
      │                        │        + msg.value      │
      │                        │                         │
      │                        │                         │ Validate:
      │                        │                         │ - Event active
      │                        │                         │ - Bets not closed
      │                        │                         │ - Amount in range
      │                        │                         │
      │                        │                         │ Update:
      │                        │                         │ - poolAboveEq or
      │                        │                         │   poolBelow
      │                        │                         │ - positions[user]
      │                        │                         │
      │                        │  Transaction confirmed  │
      │                        │ ◀───────────────────── │
      │                        │                         │
      │  5. Bet Confirmed      │                         │
      │ ◀──────────────────── │                         │
      │                        │                         │
      ▼                        ▼                         ▼

    ┌─────────────────────────────────────────────────────────────────┐
    │                    AFTER EVENT CLOSES                            │
    └─────────────────────────────────────────────────────────────────┘

      │                        │                         │
      │  6. Check Results      │                         │
      │ ────────────────────▶ │                         │
      │                        │                         │
      │                        │  fetchEventById(id)     │
      │                        │ ◀─────────────────────▶│
      │                        │                         │
      │  7. Withdraw (if won)  │                         │
      │ ────────────────────▶ │                         │
      │                        │                         │
      │                        │  withdraw(eventId)     │
      │                        │ ─────────────────────▶ │
      │                        │                         │
      │                        │                         │ Calculate payout
      │                        │                         │ Transfer funds
      │                        │                         │
      │  8. Funds Received     │                         │
      │ ◀──────────────────── │ ◀───────────────────── │
      │                        │                         │
```

---

## Liquidity Pool Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     LIQUIDITY POOL FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

           USER                                   POOL CONTRACT
             │                                          │
             │  1. Deposit MUSD                         │
             │ ──────────────────────────────────────▶ │
             │      deposit() + msg.value               │
             │                                          │
             │                                          │ - Mint LP tokens
             │                                          │ - Update totalDeposits
             │                                          │ - Emit LiquidityDeposited
             │                                          │
             │  2. Receive LP Tokens                   │
             │ ◀────────────────────────────────────── │
             │                                          │
             │                                          │
             │  ═══════════════════════════════════════│═════════════════
             │                                          │
             │          POOL PARTICIPATES IN EVENTS     │
             │                                          │
             │                                          │
             │                                          │ participateInEvent()
             │                                          │ (called by authorized)
             │                                          │       │
             │                                          │       ▼
             │                                          │  WAGER CONTRACT
             │                                          │  provideLiquidity()
             │                                          │
             │  ═══════════════════════════════════════│═════════════════
             │                                          │
             │         AFTER EVENTS COMPLETE            │
             │                                          │
             │                                          │
             │  3. Check Pool Stats                    │
             │ ──────────────────────────────────────▶ │
             │      getPoolStats()                      │
             │                                          │
             │  4. View Rewards                        │
             │ ◀────────────────────────────────────── │
             │      (totalDeposits, totalRewards)       │
             │                                          │
             │                                          │
             │  5. Withdraw                            │
             │ ──────────────────────────────────────▶ │
             │      withdraw(shares)                    │
             │                                          │
             │                                          │ - Burn LP tokens
             │                                          │ - Calculate share
             │                                          │ - Transfer MUSD + rewards
             │                                          │
             │  6. Receive MUSD + Rewards              │
             │ ◀────────────────────────────────────── │
             │                                          │
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW DIAGRAM                                │
└─────────────────────────────────────────────────────────────────────────┘

                      ┌─────────────────────────────────┐
                      │         EXTERNAL APIS           │
                      │                                 │
                      │  Coinbase (prices)              │
                      │                                 │
                      └───────────────┬─────────────────┘
                                      │
                                      │ REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     mammoth-bet-server                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  Prices ──▶ Oracle Updater ──▶ Oracle Contract                  │   │
│  │                                                                  │   │
│  │  Scheduler ──▶ Event Creator ──▶ Wager Contract                 │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Transactions
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     ETHERLINK BLOCKCHAIN                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  Oracle ◀──▶ Wager ◀──▶ Pool                                    │   │
│  │                                                                  │   │
│  │  Emits: PriceUpdated, EventCreated, BetPlaced, EventClosed...   │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Events (logs)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     mammoth-bet-backend (DipDup)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  Event Handlers ──▶ PostgreSQL ──▶ Hasura GraphQL               │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ GraphQL queries/subscriptions
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     mammoth-bet-frontend                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  API Layer ──▶ Store ──▶ Components ──▶ UI                      │   │
│  │                                                                  │   │
│  │  User Actions ──▶ SDK ──▶ Contract Calls                        │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT SEQUENCE                                  │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: Deploy Contracts
════════════════════════

    ┌─────────────────┐
    │  Deploy Oracle  │
    │  (No deps)      │
    └────────┬────────┘
             │
             │ Save ORACLE_ADDRESS
             ▼
    ┌─────────────────┐
    │  Deploy Wager   │
    │  (needs Oracle) │
    └────────┬────────┘
             │
             │ Save WAGER_ADDRESS
             ▼
    ┌─────────────────┐
    │  Deploy Pool    │
    │  (needs Wager)  │
    └────────┬────────┘
             │
             │ Save POOL_ADDRESS
             ▼

Step 2: Configure Oracle
════════════════════════

    ┌────────────────────────────────────────┐
    │  oracle.addPair("ETH-USD")             │
    │  oracle.addPair("BTC-USD")             │
    │  oracle.addPair("XTZ-USD")             │
    └────────────────────────────────────────┘
             │
             ▼

Step 3: Start Backend
═════════════════════

    ┌─────────────────────────────────────────┐
    │  Configure dipdup.etherlink.yml         │
    │  - Set contract addresses               │
    │  - Set database connection              │
    │                                         │
    │  Run: dipdup run                        │
    │                                         │
    │  (Indexer starts processing events)     │
    └────────────────────────────────────────┘
             │
             ▼

Step 4: Start Server
════════════════════

    ┌─────────────────────────────────────────┐
    │  Configure .env                          │
    │  - ORACLE_ADDRESS                        │
    │  - WAGER_ADDRESS                         │
    │  - EVENT_CREATION_ENABLED=true           │
    │  - ENABLED_DURATIONS=1d,1w,1m            │
    │  - ENABLED_PAIRS=ETH-USD,BTC-USD,XTZ-USD│
    │                                         │
    │  Run: npm start                          │
    │                                         │
    │  (Oracle updates + Event creation start)│
    └────────────────────────────────────────┘
             │
             ▼

Step 5: Deploy Frontend
═══════════════════════

    ┌─────────────────────────────────────────┐
    │  Configure src/services/config.js        │
    │  - Contract addresses                    │
    │  - GraphQL endpoints                     │
    │                                         │
    │  Build: yarn build                       │
    │                                         │
    │  Deploy: dist/ to hosting               │
    └────────────────────────────────────────┘
             │
             ▼

Step 6: Verify
══════════════

    ┌────────────────────────────────────────────────────────┐
    │                                                        │
    │  ✓ Oracle updating prices every 60s                   │
    │  ✓ Events being created automatically                 │
    │  ✓ Indexer syncing events to database                 │
    │  ✓ Frontend displaying events from GraphQL            │
    │  ✓ Users can connect wallet and place bets            │
    │                                                        │
    └────────────────────────────────────────────────────────┘
```

---

## API Reference

### mammoth-bet-server Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/update` | POST | Trigger manual price update |
| `/events/config` | GET | Get event creation configuration |
| `/events/wager-config` | GET | Get wager contract config |
| `/events/scheduler-status` | GET | Get scheduler state |
| `/events/summary` | GET | Get events summary |
| `/events/active` | GET | List all active events |
| `/events/:id` | GET | Get event by ID |
| `/events/counter` | GET | Get total event count |
| `/events/create` | POST | Create a new event |
| `/events/create-missing` | POST | Create all missing events |
| `/events/run-scheduler` | POST | Run scheduler cycle |
| `/events/:id/start-measurement` | POST | Start measurement for event |
| `/events/:id/close` | POST | Close an event |

### GraphQL Queries

```graphql
# Fetch events by status
query GetEvents($status: String!) {
  events(where: { status: { _eq: $status } }) {
    id
    status
    currencyPair { symbol }
    betsCloseTime
    poolAboveEq
    poolBelow
  }
}

# Fetch user positions
query GetUserPositions($address: String!) {
  bets(where: { user: { address: { _eq: $address } } }) {
    id
    event { id status }
    betType
    amount
    payout
    isWinner
  }
}
```

---

## Support

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

For quick setup, see [QUICK_START.md](./QUICK_START.md)

For server automation details, see [mammoth-bet-server/AUTOMATION_GUIDE.md](../mammoth-bet-server/AUTOMATION_GUIDE.md)
