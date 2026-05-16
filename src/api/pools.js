import { ALL_POOLS_QUERY, POOL_LINES_QUERY } from "@/graphql/pools"
import { executeQuery } from "./graphql"

const normalizeLine = (line) => ({
  ...line,
  poolId: line.poolId || line.pool?.address,
  currencyPairId: line.currencyPairId || line.currencyPair?.id,
})

/**
 * Fetch all pools.
 */
export const fetchAllPools = async () => {
  try {
    const data = await executeQuery(ALL_POOLS_QUERY)
    return (data?.pool || []).map((pool) => ({
      ...pool,
      poolLines: (pool.poolLines || []).map(normalizeLine),
    }))
  } catch (error) {
    console.error(
      `Error fetching pools: ${error.name}: ${error.message}`
    )
    return []
  }
}

/**
 * Fetch all pool lines.
 */
export const fetchPoolsLines = async () => {
  try {
    const data = await executeQuery(POOL_LINES_QUERY)
    return (data?.poolLine || []).map(normalizeLine)
  } catch (error) {
    console.error(
      `Error fetching pool lines: ${error.name}: ${error.message}`
    )
    return []
  }
}
