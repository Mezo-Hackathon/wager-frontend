import { gql } from '@urql/core'

// ============================================================================
// User Queries
// ============================================================================

/**
 * Fetch user by address
 */
export const USER_BY_ADDRESS_QUERY = `
  query UserByAddress($address: String!) {
    userByPk(address: $address) {
      address
      totalBetsCount
      totalBetsAmount
      totalWinnings
      totalLiquidityProvided
      totalLiquidityWithdrawn
      totalWithdrawn
      totalPoolDeposits
      totalPoolWithdrawals
      totalPoolShares
    }
  }
`

/**
 * Fetch user with all positions
 */
export const USER_WITH_POSITIONS_QUERY = `
  query UserWithPositions($address: String!) {
    userByPk(address: $address) {
      address
      totalBetsCount
      totalBetsAmount
      totalWinnings
      totalLiquidityProvided
      totalLiquidityWithdrawn
      totalWithdrawn
      totalPoolDeposits
      totalPoolWithdrawals
      totalPoolShares
      bets(order_by: { timestamp: desc }) {
        id
        event {
          id
          currencyPair {
            symbol
          }
          status
          closedOracleTime
          creator {
            address
          }
          bets {
            id
          }
        }
        user {
          address
        }
        betType
        amount
        minimalWinAmount
        payout
        isWinner
        transactionHash
        blockNumber
        timestamp
      }
      deposits(order_by: { timestamp: desc }) {
        id
        amountAboveEq
        amountBelow
        shares
        createdTime
        eventId
        userId
        transactionHash
        timestamp
      }
    }
  }
`

/**
 * Fetch user withdrawals
 */
export const USER_WITHDRAWALS_QUERY = `
  query UserWithdrawals($address: String!, $limit: Int!) {
    withdrawal(
      where: { user: { address: { _eq: $address } } }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      event {
        id
        currencyPair {
          symbol
        }
        closedOracleTime
        creator {
          address
        }
        bets {
          id
          userId
          amount
          betType
        }
        deposits {
          id
          userId
          amountBelow
          amountAboveEq
        }
        status
        winnerBets
        betsCloseTime
        measurePeriod
        totalValueLocked
        totalLiquidityProvided
      }
      user {
        address
      }
      amount
      transactionHash
      timestamp
    }
  }
`

/**
 * Fetch user statistics
 */
export const USER_STATISTICS_QUERY = `
  query UserStatistics($address: String!) {
    userStatistics(
      where: { address: { _eq: $address } }
      limit: 1
    ) {
      address
      totalBetsCount
      totalBetsAmount
      totalWinnings
      winRate
      profitLoss
    }
  }
`

/**
 * Fetch leaderboard (top users by winnings)
 */
export const LEADERBOARD_QUERY = `
  query Leaderboard($limit: Int!) {
    user(
      order_by: { totalWinnings: desc }
      limit: $limit
      where: { totalBetsCount: { _gt: 0 } }
    ) {
      address
      totalBetsCount
      totalBetsAmount
      totalWinnings
    }
  }
`

export const LEADERBOARD_BETTORS_QUERY = `
  query LeaderboardBettors($limit: Int!) {
    user(
      order_by: { totalWinnings: desc }
      limit: $limit
      where: { totalBetsCount: { _gt: 0 } }
    ) {
      address
      totalBetsCount
      totalBetsAmount
      totalWinnings
    }
  }
`

export const LEADERBOARD_PROVIDERS_QUERY = `
  query LeaderboardProviders($limit: Int!) {
    user(
      order_by: { totalLiquidityProvided: desc }
      limit: $limit
      where: { _or: [ { totalLiquidityProvided: { _gt: 0 } }, { totalPoolDeposits: { _gt: 0 } } ] }
    ) {
      address
      totalLiquidityProvided
      totalPoolDeposits
      totalWinnings
    }
  }
`

// ============================================================================
// User Subscriptions
// ============================================================================

/**
 * Subscribe to user updates
 */
export const USER_SUBSCRIPTION = `
  subscription UserSubscription($address: String!) {
    userByPk(address: $address) {
      address
      totalBetsCount
      totalBetsAmount
      totalWinnings
      totalLiquidityProvided
      totalLiquidityWithdrawn
      totalWithdrawn
      totalPoolDeposits
      totalPoolWithdrawals
      totalPoolShares
    }
  }
`
