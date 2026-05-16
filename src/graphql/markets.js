import { gql } from '@urql/core'

// ============================================================================
// Market/Currency Pair Queries
// ============================================================================

/**
 * Fetch all markets/currency pairs
 */
export const MARKETS_QUERY = `
  query Markets {
    currencyPair(
      order_by: { totalVolume: desc }
    ) {
      id
      symbol
      currentPrice
      lastPriceUpdate
      totalVolume
      totalValueLocked
      totalEvents
      events {
        betsCloseTime
        closedOracleTime
        closedRate
        createdTime
        creatorId
        currencyPairId
        id
        liquidityPercent
        measureOracleStartTime
        measurePeriod
        poolBelow
        poolAboveEq
        startRate
        status
        targetDynamics
        totalBetsAmount
        totalLiquidityProvided
        totalLiquidityShares
        totalValueLocked
        winnerBets
        }
    }
  }
`

/**
 * Fetch a single market by symbol
 */
export const MARKET_BY_SYMBOL_QUERY = `
  query MarketBySymbol($symbol: String!) {
    currencyPair(
      where: { symbol: { _eq: $symbol } }
      limit: 1
    ) {
      id
      symbol
      currentPrice
      lastPriceUpdate
      totalVolume
      totalValueLocked
      totalEvents
      events {
        betsCloseTime
        closedOracleTime
        closedRate
        createdTime
        creatorId
        currencyPairId
        id
        liquidityPercent
        measureOracleStartTime
        measurePeriod
        poolBelow
        poolAboveEq
        startRate
        status
        targetDynamics
        totalBetsAmount
        totalLiquidityProvided
        totalLiquidityShares
        totalValueLocked
        winnerBets
      }
    }
  }
`

/**
 * Fetch a single market by ID
 */
export const MARKET_BY_ID_QUERY = `
  query MarketById($id: Int!) {
    currencyPairByPk(id: $id) {
      id
      symbol
      currentPrice
      lastPriceUpdate
      totalVolume
      totalValueLocked
      totalEvents
    }
  }
`

/**
 * Fetch market statistics
 */
export const MARKET_STATISTICS_QUERY = `
  query MarketStatistics {
    currencyPairStatistics(
      order_by: { totalVolume: desc }
    ) {
      symbol
      currentPrice
      totalEvents
      totalVolume
      totalValueLocked
      uniqueBettors
      avgEventVolume
    }
  }
`

/**
 * Fetch markets with active events
 */
export const MARKETS_WITH_ACTIVE_EVENTS_QUERY = `
  query MarketsWithActiveEvents {
    currencyPair(
      where: { events: { status: { _eq: "NEW" } } }
      order_by: { totalVolume: desc }
    ) {
      id
      symbol
      currentPrice
      lastPriceUpdate
      totalVolume
      totalValueLocked
      totalEvents
      eventsAggregate(where: { status: { _eq: "NEW" } }) {
        aggregate {
          count
        }
      }
    }
  }
`

// ============================================================================
// Market Subscriptions
// ============================================================================

/**
 * Subscribe to market price updates
 */
export const MARKET_PRICE_SUBSCRIPTION = `
  subscription MarketPriceSubscription($symbol: String!) {
    currencyPair(
      where: { symbol: { _eq: $symbol } }
    ) {
      currentPrice
      lastPriceUpdate
    }
  }
`
