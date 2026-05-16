/**
 * Positions API
 * Functions for fetching user positions (bets and liquidity provisions) from the GraphQL API
 */

import { flameWager } from "@/services/sdk"
import { pipe, subscribe } from "wonka"
import { executeQuery } from "./graphql"
import { 
  USER_POSITIONS_FOR_WITHDRAW_QUERY,
  USER_ALL_POSITIONS_QUERY,
  USER_ACTIVE_POSITIONS_QUERY,
  EVENT_USER_POSITION_QUERY,
  WON_BETS_SUBSCRIPTION
} from "@/graphql/positions"

/**
 * Fetch user positions for withdrawal (winning positions that haven't been withdrawn)
 * @param {Object} params
 * @param {string} params.address - User wallet address
 * @returns {Promise<Array>} Array of positions ready for withdrawal
 */
export const fetchUserPositionsForWithdraw = async ({ address }) => {
  try {
    if (!address) {
      throw new Error("Address is required")
    }

    const lowerAddress = address.toLowerCase()
    const data = await executeQuery(USER_POSITIONS_FOR_WITHDRAW_QUERY, { address: lowerAddress })
    
    const bets = data?.bet || []
    const deposits = data?.deposit || []

    // Combine and return in a unified format for the UI
    const positions = [
      ...bets.map(b => ({ 
        ...b, 
        type: "bet",
        value: b.payout || b.amount // UI expects 'value' for withdrawal amount
      })),
      ...deposits.map(lp => ({ 
        ...lp, 
        type: "liquidity",
        value: lp.amountAboveEq 
      })),
    ]

    return positions
  } catch (error) {
    console.error(
      `Error fetching positions for withdrawal ${address}: ${error.name}: ${error.message}`
    )
    return []
  }
}

/**
 * Fetch all user positions (active and historical)
 * @param {Object} params
 * @param {string} params.address - User wallet address
 * @param {number} [params.limit] - Max number of positions
 * @returns {Promise<Array>} Array of all positions
 */
export const fetchUserPositions = async ({ address, limit = 100 }) => {
  try {
    if (!address) {
      throw new Error("Address is required")
    }

    const lowerAddress = address.toLowerCase()
    const data = await executeQuery(USER_ALL_POSITIONS_QUERY, { address: lowerAddress, limit })
    
    const bets = data?.bet || []
    const deposits = data?.deposit || []

    // Combine and sort by timestamp
    const positions = [
      ...bets.map(b => ({ ...b, type: "bet" })),
      ...deposits.map(lp => ({ ...lp, type: "liquidity" })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    return positions
  } catch (error) {
    console.error(
      `Error fetching positions for ${address}: ${error.name}: ${error.message}`
    )
    return []
  }
}

/**
 * Fetch active positions (in events that are not closed)
 * @param {Object} params
 * @param {string} params.address - User wallet address
 * @returns {Promise<Array>} Array of active positions
 */
export const fetchActivePositions = async ({ address }) => {
  try {
    if (!address) {
      throw new Error("Address is required")
    }

    const lowerAddress = address.toLowerCase()
    const data = await executeQuery(USER_ACTIVE_POSITIONS_QUERY, { address: lowerAddress })
    
    const bets = data?.bet || []
    const deposits = data?.deposit || []

    // Combine
    const positions = [
      ...bets.map(b => ({ ...b, type: "bet" })),
      ...deposits.map(lp => ({ ...lp, type: "liquidity" })),
    ]

    return positions
  } catch (error) {
    console.error(
      `Error fetching active positions for ${address}: ${error.name}: ${error.message}`
    )
    return []
  }
}

/**
 * Fetch position for a specific event and user
 * @param {Object} params
 * @param {string} params.address - User wallet address
 * @param {number} params.eventId - Event ID
 * @returns {Promise<Object|null>} Position object or null
 */
export const fetchPositionForEvent = async ({ address, eventId }) => {
  try {
    if (!address || eventId === undefined) {
      throw new Error("Address and eventId are required")
    }

    const lowerAddress = address.toLowerCase()
    const data = await executeQuery(EVENT_USER_POSITION_QUERY, { address: lowerAddress, eventId })
    
    const bets = data?.bet || []
    const deposits = data?.deposit || []

    if (bets.length > 0) {
      return { ...bets[0], type: "bet" }
    }

    if (deposits.length > 0) {
      return { ...deposits[0], type: "liquidity" }
    }

    return null
  } catch (error) {
    console.error(
      `Error fetching position for event ${eventId}: ${error.name}: ${error.message}`
    )
    return null
  }
}

/**
 * Subscribe to user position updates (won bets)
 * @param {string} address - User wallet address
 * @param {Function} onUpdate - Callback when positions update
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToUserPositions = (address, onUpdate) => {
  try {
    if (!address) {
      return { unsubscribe: () => { } }
    }

    if (typeof onUpdate !== 'function') {
      throw new Error("onUpdate callback is required")
    }

    if (!flameWager.gql) {
      console.warn("GraphQL client not initialized")
      return { unsubscribe: () => { } }
    }

    const lowerAddress = address.toLowerCase()
    
    // Use Wonka pipe and subscribe for URQL subscriptions
    const { unsubscribe } = pipe(
      flameWager.gql.subscription(WON_BETS_SUBSCRIPTION, { address: lowerAddress }),
      subscribe((result) => {
        if (result.error) {
          console.error("Positions subscription error:", result.error)
          return
        }

        const wonBets = result.data?.bet || []
        onUpdate(wonBets.map(b => ({ 
          ...b, 
          type: "bet",
          value: b.payout || b.amount 
        })))
      })
    )

    return { unsubscribe }
  } catch (error) {
    console.error(
      `Error subscribing to positions for ${address}: ${error.name}: ${error.message}`
    )
    return { unsubscribe: () => { } }
  }
}
