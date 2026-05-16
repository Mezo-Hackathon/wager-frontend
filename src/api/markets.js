/**
 * Markets API
 * Functions for fetching currency pairs and market data from the GraphQL API
 */

import { flameWager } from "@/services/sdk"
import { pipe, subscribe } from "wonka"
import {
  MARKETS_QUERY,
  MARKET_BY_SYMBOL_QUERY,
  MARKET_BY_ID_QUERY,
  MARKET_STATISTICS_QUERY,
  MARKETS_WITH_ACTIVE_EVENTS_QUERY,
  MARKET_PRICE_SUBSCRIPTION,
} from "@/graphql/markets"
import { executeQuery } from "./graphql"

/**
 * Fetch all markets/currency pairs
 * @returns {Promise<Array>} Array of currency pairs
 */
export const fetchMarkets = async () => {
  try {
    const data = await executeQuery(MARKETS_QUERY)
    return data?.currencyPair || []
  } catch (error) {
    console.error(
      `Error fetching markets: ${error.name}: ${error.message}`
    )
    return []
  }
}

/**
 * Fetch a single market by symbol
 * @param {string} symbol - Currency pair symbol (e.g., "ETH-USD")
 * @returns {Promise<Object|null>} Currency pair object or null
 */
export const fetchMarketBySymbol = async (symbol) => {
  try {
    if (!symbol) {
      throw new Error("Symbol is required")
    }

    const data = await executeQuery(MARKET_BY_SYMBOL_QUERY, { symbol })
    return data?.currencyPair?.[0] || null
  } catch (error) {
    console.error(
      `Error fetching market ${symbol}: ${error.name}: ${error.message}`
    )
    return null
  }
}

/**
 * Fetch a single market by ID
 * @param {number} id - Currency pair ID
 * @returns {Promise<Object|null>} Currency pair object or null
 */
export const fetchMarketById = async (id) => {
  try {
    if (id === undefined || id === null) {
      throw new Error("Market ID is required")
    }

    const data = await executeQuery(MARKET_BY_ID_QUERY, { id })
    return data?.currencyPairByPk || null
  } catch (error) {
    console.error(
      `Error fetching market ${id}: ${error.name}: ${error.message}`
    )
    return null
  }
}

/**
 * Fetch market statistics
 * @returns {Promise<Array>} Array of market statistics
 */
export const fetchMarketStatistics = async () => {
  try {
    const data = await executeQuery(MARKET_STATISTICS_QUERY)
    return data?.currencyPairStatistics || []
  } catch (error) {
    console.error(
      `Error fetching market statistics: ${error.name}: ${error.message}`
    )
    return []
  }
}

/**
 * Subscribe to market price updates
 * @param {string} symbol - Currency pair symbol
 * @param {Function} onUpdate - Callback when price updates
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToMarketPrice = (symbol, onUpdate) => {
  try {
    if (!symbol) {
      throw new Error("Symbol is required")
    }

    if (typeof onUpdate !== 'function') {
      throw new Error("onUpdate callback is required")
    }

    if (!flameWager.gql) {
      console.warn("GraphQL client not initialized")
      return { unsubscribe: () => { } }
    }

    // Use Wonka pipe and subscribe for URQL subscriptions
    const { unsubscribe } = pipe(
      flameWager.gql.subscription(MARKET_PRICE_SUBSCRIPTION, { symbol }),
      subscribe((result) => {
        if (result.error) {
          console.error("Market price subscription error:", result.error)
          return
        }

        if (result?.data?.currencyPair?.[0]) {
          onUpdate(result.data.currencyPair[0])
        }
      })
    )

    return { unsubscribe }
  } catch (error) {
    console.error(
      `Error subscribing to market price ${symbol}: ${error.name}: ${error.message}`
    )
    return { unsubscribe: () => { } }
  }
}

/**
 * Fetch markets with active events
 * @returns {Promise<Array>} Array of markets that have active (NEW) events
 */
export const fetchMarketsWithActiveEvents = async () => {
  try {
    const data = await executeQuery(MARKETS_WITH_ACTIVE_EVENTS_QUERY)
    return data?.currencyPair || []
  } catch (error) {
    console.error(
      `Error fetching markets with active events: ${error.name}: ${error.message}`
    )
    return []
  }
}
