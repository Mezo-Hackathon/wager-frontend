import { gql } from '@urql/core'

// ============================================================================
// Event Queries
// ============================================================================

/**
 * Fetch events by status
 */
export const EVENTS_BY_STATUS_QUERY = `
  query EventsByStatus($status: String!, $limit: Int!, $offset: Int!) {
    event(
      where: { status: { _eq: $status } }
      order_by: { createdTime: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      status
      currencyPair {
        id
        symbol
      }
      creator {
        address
      }
      targetDynamics
      betsCloseTime
      measurePeriod
      createdTime
      liquidityPercent
      poolAboveEq
      poolBelow
      totalLiquidityShares
      totalBetsAmount
      totalLiquidityProvided
      totalValueLocked
      startRate
      closedRate
      winnerBets
      measureOracleStartTime
      closedOracleTime
      bets {
        id
        user {
          address
        }
        betType
        amount
        minimalWinAmount
        payout
        timestamp
      }
      deposits {
        id
        userId
        eventId
        amountAboveEq
        amountBelow
        shares
        timestamp
      }
    }
  }
`

/**
 * Fetch single event by ID (with participants)
 */
export const EVENT_BY_ID_QUERY = `
  query EventById($id: bigint!) {
    eventByPk(id: $id) {
      id
      status
      currencyPair {
        id
        symbol
      }
      creator {
        address
      }
      targetDynamics
      betsCloseTime
      measurePeriod
      createdTime
      liquidityPercent
      poolAboveEq
      poolBelow
      totalLiquidityShares
      totalBetsAmount
      totalLiquidityProvided
      totalValueLocked
      startRate
      closedRate
      winnerBets
      measureOracleStartTime
      closedOracleTime
      bets {
        id
        user {
          address
        }
        betType
        amount
        minimalWinAmount
        payout
        timestamp
      }
      deposits {
        id
        userId
        eventId
        amountAboveEq
        amountBelow
        shares
        timestamp
      }
    }
  }
`

/**
 * Fetch events by market/currency pair
 */
export const EVENTS_BY_MARKET_QUERY = `
  query EventsByMarket($currencyPairId: Int!, $status: String, $limit: Int!) {
    event(
      where: {
        currencyPair: { id: { _eq: $currencyPairId } }
        status: { _eq: $status }
      }
      order_by: { createdTime: desc }
      limit: $limit
    ) {
      id
      status
      currencyPair {
        id
        symbol
      }
      creator {
        address
      }
      targetDynamics
      betsCloseTime
      measurePeriod
      createdTime
      liquidityPercent
      poolAboveEq
      poolBelow
      totalLiquidityShares
      totalBetsAmount
      totalLiquidityProvided
      totalValueLocked
      startRate
      closedRate
      winnerBets
      measureOracleStartTime
      closedOracleTime
    }
  }
`

/**
 * Fetch top events by total value locked
 */
export const TOP_EVENTS_QUERY = `
  query TopEvents($limit: Int!) {
    event(
      where: { status: { _eq: "NEW" } }
      order_by: { totalValueLocked: desc }
      limit: $limit
    ) {
      id
      status
      currencyPair {
        id
        symbol
      }
      creator {
        address
      }
      targetDynamics
      betsCloseTime
      measurePeriod
      createdTime
      liquidityPercent
      poolAboveEq
      poolBelow
      totalLiquidityShares
      totalBetsAmount
      totalLiquidityProvided
      totalValueLocked
      startRate
      closedRate
      winnerBets
      measureOracleStartTime
      closedOracleTime
    }
  }
`

/**
 * Fetch bets for an event
 */
export const EVENT_BETS_QUERY = `
  query EventBets($eventId: bigint!) {
    bet(
      where: { event: { id: { _eq: $eventId } } }
      order_by: { timestamp: desc }
    ) {
      id
      user {
        address
      }
      betType
      amount
      minimalWinAmount
      payout
      isWinner
      transactionHash
      timestamp
    }
  }
`

/**
 * Fetch liquidity provisions for an event
 */
export const EVENT_LIQUIDITY_QUERY = `
  query EventLiquidity($eventId: bigint!) {
    deposit(
      where: { event: { id: { _eq: $eventId } } }
      order_by: { timestamp: desc }
    ) {
      id
      userId
      eventId
      amountAboveEq
      amountBelow
      shares
      timestamp
      transactionHash
    }
  }
`

/**
 * Fetch events where user has bets
 */
export const USER_EVENTS_QUERY = `
  query UserEvents($address: String!, $limit: Int!) {
    bet(
      where: { user: { address: { _eq: $address } } }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      event {
        id
        status
        currencyPair {
          id
          symbol
        }
        creator {
          address
        }
        targetDynamics
        betsCloseTime
        measurePeriod
        createdTime
        liquidityPercent
        poolAboveEq
        poolBelow
        totalLiquidityShares
        totalBetsAmount
        totalLiquidityProvided
        totalValueLocked
        startRate
        closedRate
        winnerBets
        measureOracleStartTime
        closedOracleTime
      }
    }
  }
`

// ============================================================================
// Event Subscriptions
// ============================================================================

/**
 * Subscribe to event updates
 */
export const EVENT_SUBSCRIPTION = `
  subscription EventSubscription($id: bigint!) {
    eventByPk(id: $id) {
      id
      status
      currencyPair {
        id
        symbol
      }
      creator {
        address
      }
      targetDynamics
      betsCloseTime
      measurePeriod
      createdTime
      liquidityPercent
      poolAboveEq
      poolBelow
      totalLiquidityShares
      totalBetsAmount
      totalLiquidityProvided
      totalValueLocked
      startRate
      closedRate
      winnerBets
      measureOracleStartTime
      closedOracleTime
      bets {
        id
        user {
          address
        }
        betType
        amount
        minimalWinAmount
        payout
        timestamp
      }
      deposits {
        id
        userId
        eventId
        amountAboveEq
        amountBelow
        shares
        timestamp
      }
    }
  }
`

/**
 * Subscribe to new events
 */
export const NEW_EVENTS_SUBSCRIPTION = `
  subscription NewEvents($limit: Int!) {
    event(
      where: { status: { _eq: "NEW" } }
      order_by: { createdTime: desc }
      limit: $limit
    ) {
      id
      status
      currencyPair {
        id
        symbol
      }
      creator {
        address
      }
      targetDynamics
      betsCloseTime
      measurePeriod
      createdTime
      liquidityPercent
      poolAboveEq
      poolBelow
      totalLiquidityShares
      totalBetsAmount
      totalLiquidityProvided
      totalValueLocked
      startRate
      closedRate
      winnerBets
      measureOracleStartTime
      closedOracleTime
    }
  }
`

/**
 * Subscribe to user position on event
 */
export const USER_POSITION_SUBSCRIPTION = `
  subscription UserPositionSubscription($eventId: bigint!, $userAddress: String!) {
    bet(
      where: {
        event: { id: { _eq: $eventId } }
        user: { address: { _eq: $userAddress } }
      }
    ) {
      id
      betType
      amount
      minimalWinAmount
      payout
      isWinner
      timestamp
    }
  }
`
