/**
 * Users API
 * Functions for fetching user data and statistics from the GraphQL API
 */

import { flameWager } from "@/services/sdk"
import { pipe, subscribe } from "wonka"
import { executeQuery } from "./graphql"
import {
  USER_BY_ADDRESS_QUERY,
  USER_WITH_POSITIONS_QUERY,
  USER_WITHDRAWALS_QUERY,
  USER_STATISTICS_QUERY,
  LEADERBOARD_QUERY,
  USER_SUBSCRIPTION
} from "@/graphql/users"

/**
 * Fetch user by address
 * @param {string} address - User wallet address
 * @returns {Promise<Object|null>} User object or null
 */
export const fetchUser = async (address) => {
  try {
    if (!address) {
      throw new Error("Address is required")
    }

    const data = await executeQuery(USER_BY_ADDRESS_QUERY, { address })
    return data?.usersByPk || null
  } catch (error) {
    console.error(
      `Error fetching user ${address}: ${error.name}: ${error.message}`
    )
    return null
  }
}

/**
 * Fetch user with all positions (bets and liquidity)
 * @param {string} address - User wallet address
 * @returns {Promise<Object|null>} User object with positions or null
 */
export const fetchUserWithPositions = async (address) => {
  try {
    if (!address) {
      throw new Error("Address is required")
    }

    const data = await executeQuery(USER_WITH_POSITIONS_QUERY, { address })
    return data?.usersByPk || null
  } catch (error) {
    console.error(
      `Error fetching user positions ${address}: ${error.name}: ${error.message}`
    )
    return null
  }
}

/**
 * Fetch user withdrawals
 * @param {Object} params
 * @param {string} params.address - User wallet address
 * @param {number} [params.limit] - Max number of withdrawals
 * @returns {Promise<Array>} Array of withdrawals
 */
export const fetchUserWithdrawals = async ({ address, limit = 100 }) => {
  try {
    if (!address) {
      throw new Error("Address is required")
    }

    const data = await executeQuery(USER_WITHDRAWALS_QUERY, { address, limit })
    return data?.withdrawal || []
  } catch (error) {
    console.error(
      `Error fetching withdrawals for ${address}: ${error.name}: ${error.message}`
    )
    return []
  }
}

/**
 * Fetch user statistics
 * @param {string} address - User wallet address
 * @returns {Promise<Object|null>} User statistics or null
 */
export const fetchUserStatistics = async (address) => {
  try {
    if (!address) {
      throw new Error("Address is required")
    }

    const data = await executeQuery(USER_STATISTICS_QUERY, { address })
    return data?.userStatistics?.[0] || null
  } catch (error) {
    console.error(
      `Error fetching statistics for ${address}: ${error.name}: ${error.message}`
    )
    return null
  }
}

/**
 * Fetch leaderboard (top users by winnings)
 * @param {Object} [params]
 * @param {number} [params.limit] - Max number of users
 * @returns {Promise<Array>} Array of users sorted by winnings
 */
export const fetchLeaderboard = async ({ limit = 20 } = {}) => {
  try {
    const data = await executeQuery(LEADERBOARD_QUERY, { limit })
    return data?.users || []
  } catch (error) {
    console.error(
      `Error fetching leaderboard: ${error.name}: ${error.message}`
    )
    return []
  }
}

/**
 * Subscribe to user updates
 * @param {string} address - User wallet address
 * @param {Function} onUpdate - Callback when user data updates
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToUser = (address, onUpdate) => {
  try {
    if (!address) {
      return { unsubscribe: () => {} }
    }

    if (typeof onUpdate !== 'function') {
      throw new Error("onUpdate callback is required")
    }

    if (!flameWager.gql) {
      console.warn("GraphQL client not initialized")
      return { unsubscribe: () => {} }
    }

    // Use Wonka pipe and subscribe for URQL subscriptions
    const { unsubscribe } = pipe(
      flameWager.gql.subscription(USER_SUBSCRIPTION, { address }),
      subscribe((result) => {
        if (result.error) {
          console.error("User subscription error:", result.error)
          return
        }

        if (result?.data?.usersByPk) {
          onUpdate(result.data.usersByPk)
        }
      })
    )

    return { unsubscribe }
  } catch (error) {
    console.error(
      `Error subscribing to user ${address}: ${error.name}: ${error.message}`
    )
    return { unsubscribe: () => {} }
  }
}
