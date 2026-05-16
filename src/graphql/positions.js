import { gql } from '@urql/core'

/**
 * Fetch all withdrawable positions for a user
 * Targets winning bets and liquidity provisions in closed events
 */
export const USER_POSITIONS_FOR_WITHDRAW_QUERY = `
  query UserPositionsForWithdraw($address: String!) {
    bet(
      where: {
        userId: { _eq: $address }
        isWinner: { _eq: true }
        event: { status: { _eq: "CLOSED" } }
      }
      order_by: { timestamp: desc }
    ) {
      id
      betType
      amount
      payout
      isWinner
      transactionHash
      timestamp
      event {
        id
        status
        winnerBets
        betsCloseTime
        measurePeriod
        totalValueLocked
        totalLiquidityProvided
        closedOracleTime
        currencyPair {
          symbol
        }
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
      }
    }
    deposit(
      where: {
        userId: { _eq: $address }
        event: { status: { _eq: "CLOSED" } }
      }
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
      event {
        id
        status
        winnerBets
        betsCloseTime
        measurePeriod
        totalValueLocked
        totalLiquidityProvided
        currencyPair {
          symbol
        }
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
      }
    }
  }
`

/**
 * Subscribe to new winning bets for a user
 */
export const WON_BETS_SUBSCRIPTION = `
  subscription WonBets($address: String!) {
    bet(
      where: {
        userId: { _eq: $address }
        isWinner: { _eq: true }
        event: { status: { _eq: "CLOSED" } }
      }
      order_by: { timestamp: desc }
    ) {
      id
      betType
      amount
      payout
      isWinner
      transactionHash
      timestamp
      event {
        id
        status
        winnerBets
        betsCloseTime
        measurePeriod
        totalValueLocked
        totalLiquidityProvided
        currencyPair {
          symbol
        }
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
      }
    }
  }
`

/**
 * Fetch all bets and deposits for a user
 */
export const USER_ALL_POSITIONS_QUERY = `
  query UserAllPositions($address: String!, $limit: Int!) {
    bet(
      where: { userId: { _eq: $address } }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      betType
      amount
      payout
      isWinner
      timestamp
      event {
        id
        status
        closedOracleTime
        currencyPair {
          symbol
        }
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
      }
    }
    deposit(
      where: { userId: { _eq: $address } }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      amountAboveEq
      amountBelow
      shares
      timestamp
      event {
        id
        status
        closedOracleTime
        currencyPair {
          symbol
        }
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
      }
    }
  }
`

/**
 * Fetch active bets and deposits (NEW or MEASUREMENT_STARTED)
 */
export const USER_ACTIVE_POSITIONS_QUERY = `
  query UserActivePositions($address: String!) {
    bet(
      where: {
        userId: { _eq: $address }
        event: { status: { _in: ["NEW", "MEASUREMENT_STARTED"] } }
      }
      order_by: { timestamp: desc }
    ) {
      id
      betType
      amount
      payout
      timestamp
      event {
        id
        status
        closedOracleTime
        currencyPair {
          symbol
        }
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
      }
    }
    deposit(
      where: {
        userId: { _eq: $address }
        event: { status: { _in: ["NEW", "MEASUREMENT_STARTED"] } }
      }
      order_by: { timestamp: desc }
    ) {
      id
      amountAboveEq
      amountBelow
      shares
      timestamp
      event {
        id
        status
        closedOracleTime
        currencyPair {
          symbol
        }
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
      }
    }
  }
`

/**
 * Fetch user's position for a specific event
 */
export const EVENT_USER_POSITION_QUERY = `
  query EventUserPosition($address: String!, $eventId: bigint!) {
    bet(
      where: {
        userId: { _eq: $address }
        eventId: { _eq: $eventId }
      }
      limit: 1
    ) {
      id
      betType
      amount
      payout
      isWinner
      timestamp
    }
    deposit(
      where: {
        userId: { _eq: $address }
        eventId: { _eq: $eventId }
      }
      limit: 1
    ) {
      id
      amountAboveEq
      amountBelow
      shares
      timestamp
    }
  }
`
