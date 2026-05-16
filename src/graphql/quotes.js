/**
 * Quote Queries
 * GraphQL queries for fetching price quotes and TVL data
 */

/**
 * Fetch quotes by market/currency pair
 */
export const QUOTES_BY_MARKET_QUERY = `
  query QuotesByMarket($currencyPairId: Int!, $limit: Int!, $offset: Int!) {
    quotesWma(
      where: { currencyPairId: { _eq: $currencyPairId } }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      currencyPairId
      price
      timestamp
    }
  }
`

/**
 * Fetch quotes by time range
 */
export const QUOTE_BY_RANGE_QUERY = `
  query QuoteByRange($currencyPairId: Int!, $tsGt: timestamptz!, $tsLt: timestamptz!) {
    quotesWma(
      where: {
        timestamp: { _gte: $tsGt, _lte: $tsLt }
        currencyPairId: { _eq: $currencyPairId }
      }
      order_by: { timestamp: desc }
    ) {
      currencyPairId
      price
      timestamp
    }
  }
`

/**
 * Fetch quote by specific timestamp
 */
export const QUOTE_BY_TIMESTAMP_QUERY = `
  query QuoteByTimestamp($currencyPairId: Int!, $timestamp: timestamptz!) {
    quotesWma(
      where: {
        currencyPairId: { _eq: $currencyPairId }
        timestamp: { _eq: $timestamp }
      }
      order_by: { timestamp: desc }
      limit: 1
    ) {
      currencyPairId
      price
      timestamp
    }
  }
`

/**
 * Fetch event TVL stats
 */
export const EVENT_TVL_QUERY = `
  query EventTVL($id: bigint!) {
    eventByPk(id: $id) {
      id
      totalValueLocked
    }
  }
`

/**
 * Subscribe to price quotes
 */
export const QUOTES_SUBSCRIPTION = `
  subscription QuotesSubscription($currencyPairId: Int!) {
    quotesWma(
      where: { currencyPairId: { _eq: $currencyPairId } }
      order_by: { timestamp: desc }
      limit: 1
    ) {
      currencyPairId
      price
      timestamp
    }
  }
`
