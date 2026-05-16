/**
 * Quotes API
 * Functions for fetching price quotes and TVL data
 */

import { executeQuery } from "./graphql"
import {
	QUOTES_BY_MARKET_QUERY,
	QUOTE_BY_RANGE_QUERY,
	QUOTE_BY_TIMESTAMP_QUERY,
	EVENT_TVL_QUERY,
} from "@/graphql/quotes"

/**
 * Fetch quotes for a specific market
 */
export const fetchQuotesByMarket = async ({ id, limit = 100, offset = 0 }) => {
	try {
		if (id === undefined || id === null) {
			throw new Error("Market ID (currencyPairId) is required")
		}

		const data = await executeQuery(QUOTES_BY_MARKET_QUERY, {
			currencyPairId: id,
			limit,
			offset,
		})

		return data?.quotesWma || []
	} catch (error) {
		console.error(
			`Error fetching quotes for market ${id}: ${error.name}: ${error.message}`
		)
		return []
	}
}

/**
 * Fetch quotes by time range
 */
export const fetchQuoteByRange = async ({ id, tsGt, tsLt }) => {
	try {
		if (id === undefined || id === null) {
			throw new Error("Market ID is required")
		}

		const data = await executeQuery(QUOTE_BY_RANGE_QUERY, {
			currencyPairId: id,
			tsGt,
			tsLt,
		})

		return data?.quotesWma || []
	} catch (error) {
		console.error(
			`Error fetching quotes by range for market ${id}: ${error.name}: ${error.message}`
		)
		return []
	}
}

/**
 * Fetch quote for a specific timestamp
 */
export const fetchQuoteByTimestamp = async ({ id, ts }) => {
	try {
		if (id === undefined || id === null) {
			throw new Error("Market ID is required")
		}

		const data = await executeQuery(QUOTE_BY_TIMESTAMP_QUERY, {
			currencyPairId: id,
			timestamp: ts,
		})

		return data?.quotesWma || []
	} catch (error) {
		console.error(
			`Error fetching quote for market ${id} at ${ts}: ${error.name}: ${error.message}`
		)
		return []
	}
}

/**
 * Fetch TVL for an event
 */
export const fetchEventTVL = async ({ id }) => {
	try {
		if (id === undefined || id === null) {
			throw new Error("Event ID is required")
		}

		const data = await executeQuery(EVENT_TVL_QUERY, { id })

		// The query returns eventByPk, and we want to return just the TVL value or the object
		return data?.eventByPk || null
	} catch (error) {
		console.error(
			`Error fetching TVL for event ${id}: ${error.name}: ${error.message}`
		)
		return null
	}
}

