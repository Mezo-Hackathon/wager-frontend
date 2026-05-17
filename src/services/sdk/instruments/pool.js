import { markRaw } from "vue"
import BigNumber from "bignumber.js"
import { calculateAPY, calculateRiskIndex, calculateUtilization } from "../estimators"
import { executeQuery } from "@/api/graphql"

export class Pool {
  constructor(address, contract, gqlClient) {
    this.address = address
    this.contract = markRaw(contract)
    this.gql = gqlClient

    // Unsubscribe functions
    this.unsubscribeFromRiskIndex = () => {}
    this.unsubscribeFromUtilization = () => {}
    this.unsubscribeFromAPY = () => {}
    this.unsubscribeFromLastPoolState = () => {}
  }

  /**
   * Get basic pool info from GraphQL
   */
  async getInfo() {
    const query = `
      query GetPoolInfo($address: String!) {
        pool(where: { address: { _eq: $address } }) {
          address
          name
          version
          isDepositPaused
          entryLockPeriod
        }
      }
    `
    try {
      const data = await executeQuery(query, { address: this.address.toLowerCase() })
      const info = data?.pool?.[0]
      if (!info) {
          // Fallback to contract if not indexed yet
          const name = await this.contract.name()
          return {
              address: this.address,
              name,
              version: "1.0.0",
              isDepositPaused: false,
              entryLockPeriod: 0
          }
      }

      return {
        ...info,
        entryLockPeriod: Number(info.entryLockPeriod)
      }
    } catch (err) {
      console.error("Error fetching pool info:", err)
      return null
    }
  }

  /**
   * Deposit into the pool
   * @param {BigNumber|string|bigint} amount - The amount of MUSD to deposit in wei
   * @returns {Promise<ethers.TransactionResponse>} The transaction response
   */
  async deposit(amount) {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.deposit(amount)
  }

  /**
   * Withdraw from the pool
   * @param {BigNumber|string|bigint} shares - The amount of shares to withdraw in wei
   * @returns {Promise<ethers.TransactionResponse>} The transaction response
   */
  async withdraw(shares) {
    if (!this.contract) throw new Error("Contract not initialized")
    return await this.contract.withdraw(shares)
  }

  /**
   * Withdraw rewards/claims from specific events
   * @param {number[]} eventIds - Array of event IDs to withdraw rewards from
   * @returns {Promise<Object>} A pseudo-transaction object that implements .wait()
   */
  async withdrawClaims(eventIds) {
    if (!this.contract) throw new Error("Contract not initialized")
    
    // The contract uses payReward(eventId). We loop for multiple.
    const txs = []
    for (const eventId of eventIds) {
        const tx = await this.contract.payReward(eventId)
        txs.push(tx)
    }

    return {
        hash: txs.map(t => t.hash).join(", "),
        wait: async () => {
            const receipts = await Promise.all(txs.map(t => t.wait()))
            return receipts
        }
    }
  }

  /**
   * Fetch last pool state from GraphQL
   */
  async getLastPoolState() {
    const query = `
      query GetLastPoolState($address: String!) {
        poolState(
          where: { poolId: { _eq: $address } }
          order_by: { counter: desc }
          limit: 1
        ) {
          totalLiquidity
          sharePrice
          timestamp
          activeLiquidity
          withdrawableLiquidity
          counter
        }
      }
    `
    try {
      const data = await executeQuery(query, { address: this.address.toLowerCase() })
      const state = data?.poolState?.[0]
      if (state) {
        return {
          ...state,
          totalLiquidity: new BigNumber(state.totalLiquidity),
          sharePrice: new BigNumber(state.sharePrice),
          timestamp: new Date(state.timestamp)
        }
      }

      const fallbackQuery = `
        query GetPoolPositionsFallback($address: String!) {
          poolPosition(where: { poolId: { _eq: $address } }) {
            depositedAmount
            withdrawnAmount
            realizedProfit
            shares
          }
        }
      `
      const fallbackData = await executeQuery(fallbackQuery, { address: this.address.toLowerCase() })
      
      console.log("Fallback query result:", fallbackData)

      const positions = fallbackData?.poolPosition || []
      
      let totalLiquidity = new BigNumber(0)
      let totalShares = new BigNumber(0)
      
      positions.forEach(pos => {
          totalLiquidity = totalLiquidity.plus(pos.depositedAmount || 0).plus(pos.realizedProfit || 0).minus(pos.withdrawnAmount || 0)
          totalShares = totalShares.plus(pos.shares || 0)
      })

      const sharePrice = totalShares.isZero() ? new BigNumber(1) : totalLiquidity.div(totalShares)

      const fallbackState = {
          totalLiquidity,
          sharePrice,
          timestamp: new Date(),
          activeLiquidity: totalLiquidity, // Approximation
          withdrawableLiquidity: new BigNumber(0),
          counter: 0,
          isFallback: true
      }
      
      console.log("Fallback state object created:", fallbackState)
      return fallbackState
    } catch (err) {
      console.error("Error fetching last pool state:", err)
      return null
    }
  }

  /**
   * Fetch first pool state from GraphQL (used for APY)
   */
  async getFirstPoolState(dateFrom = new Date("2020-01-01")) {
    const query = `
      query GetFirstPoolState($address: String!, $dateFrom: timestamptz!) {
        poolState(
          where: { 
            poolId: { _eq: $address },
            timestamp: { _gte: $dateFrom }
          }
          order_by: { counter: asc }
          limit: 1
        ) {
          sharePrice
          timestamp
        }
      }
    `
    try {
      const data = await executeQuery(query, { 
        address: this.address.toLowerCase(),
        dateFrom: dateFrom.toISOString()
      })
      const state = data?.poolState?.[0]
      return state
    } catch (err) {
      console.error("Error fetching first pool state:", err)
      return null
    }
  }

  /**
   * Get Current APY
   */
  async getAPY(dateFrom) {
    const firstState = await this.getFirstPoolState(dateFrom)
    const lastState = await this.getLastPoolState()
    return calculateAPY(firstState, lastState)
  }

  /**
   * Subscriptions
   */

  async subscribeToLastPoolState(callback) {
    this.unsubscribeFromLastPoolState()

    const subscription = `
      subscription WatchPoolState($address: String!) {
        poolState(
          where: { poolId: { _eq: $address } }
          order_by: { counter: desc }
          limit: 1
        ) {
          totalLiquidity
          sharePrice
          timestamp
          activeLiquidity
          withdrawableLiquidity
          counter
        }
      }
    `
    const { unsubscribe } = this.gql.subscription(subscription, { address: this.address.toLowerCase() }).subscribe({
      next: (result) => {
        const state = result.data?.poolState?.[0]
        if (state) {
          callback({
            ...state,
            totalLiquidity: new BigNumber(state.totalLiquidity),
            sharePrice: new BigNumber(state.sharePrice),
            timestamp: new Date(state.timestamp)
          })
        }
      },
      error: console.error
    })

    this.unsubscribeFromLastPoolState = unsubscribe
  }

  async subscribeToAPY(callback, dateFrom) {
    this.unsubscribeFromAPY()
    const firstState = await this.getFirstPoolState(dateFrom)

    this.subscribeToLastPoolState((newState) => {
      callback(calculateAPY(firstState, newState))
    })
    
    this.unsubscribeFromAPY = () => {
        this.unsubscribeFromLastPoolState()
    }
  }

  async subscribeToRiskIndex(callback, limit = 100) {
    this.unsubscribeFromRiskIndex()

    const subscription = `
      subscription WatchPoolEvents($address: String!, $limit: Int!) {
        poolEvent(
          where: { 
            poolId: { _eq: $address },
            result: { _is_null: false }
          }
          order_by: { id: desc }
          limit: $limit
        ) {
          provided
          result
        }
      }
    `
    const { unsubscribe } = this.gql.subscription(subscription, { 
      address: this.address.toLowerCase(),
      limit 
    }).subscribe({
      next: (result) => {
        const events = result.data?.poolEvent || []
        callback(calculateRiskIndex(events))
      },
      error: console.error
    })

    this.unsubscribeFromRiskIndex = unsubscribe
  }

  async subscribeToUtilization(callback, limit = 100) {
    this.unsubscribeFromUtilization()

    const subscription = `
      subscription WatchUtilization($address: String!, $limit: Int!) {
        poolEvent(
          where: { 
            poolId: { _eq: $address },
            eventId: { _is_null: false }
          }
          order_by: { id: desc }
          limit: $limit
        ) {
          event {
            totalBetsAmount
            totalLiquidityProvided
          }
        }
      }
    `
    const { unsubscribe } = this.gql.subscription(subscription, { 
      address: this.address.toLowerCase(),
      limit 
    }).subscribe({
      next: (result) => {
        const events = (result.data?.poolEvent || []).map(pe => pe.event)
        callback(calculateUtilization(events))
      },
      error: console.error
    })

    this.unsubscribeFromUtilization = unsubscribe
  }
}
