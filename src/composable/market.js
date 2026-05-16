import { reactive } from "vue"
import { DateTime } from "luxon"
import { pipe, subscribe } from "wonka"

/**
 * Services
 */
import { supportedMarkets } from "~/services/config"
import { flameWager } from "@sdk"

/**
 * API
 */
import { fetchMarkets } from "@/api/markets"
import { fetchQuotesByMarket, fetchQuoteByTimestamp } from "@/api/quotes"
import { fetchUserPositionsForWithdraw } from "@/api/positions"
import { fetchUserWithdrawals } from "@/api/users"
import { WON_BETS_SUBSCRIPTION } from "@/graphql/positions"
import { QUOTES_SUBSCRIPTION } from "@/graphql/quotes"

/**
 * Store
 */
import { useMarketStore } from "@store/market"
import { useAccountStore } from "@store/account"

export const useMarket = () => {
	const marketStore = useMarketStore()
	const accountStore = useAccountStore()

	const markets = reactive([])

	const setupUser = async () => {
		const lowerAddress = accountStore.pkh.toLowerCase()

		/** All positions for withdraw */
		const userPositions = await fetchUserPositionsForWithdraw({
			address: lowerAddress,
		})
		accountStore.positionsForWithdrawal = userPositions
		accountStore.isPositionsLoading = false

		/** Withdrawals */
		accountStore.withdrawals = await fetchUserWithdrawals({
			address: lowerAddress,
		})

		/**
		 * Subscriptions
		 */

		/** New Won Bets */
		if (flameWager.gql) {
			pipe(
				flameWager.gql.subscription(WON_BETS_SUBSCRIPTION, { address: lowerAddress }),
				subscribe((result) => {
					if (result.error) {
						console.error("Won bets subscription error:", result.error)
						return
					}
					const wonBets = result.data?.bet || []
					// Replace the whole array to keep it in sync and map payout to value
					accountStore.positionsForWithdrawal = wonBets.map(b => ({
						...b,
						type: "bet",
						value: b.payout || b.amount
					}))
				})
			)
		}
	}

	const updateWithdrawals = async () => {
		accountStore.withdrawals = await fetchUserWithdrawals({
			address: accountStore.pkh.toLowerCase(),
		})
	}

	const setupMarket = async () => {
		const allMarkets = await fetchMarkets()

		/** only available */
		markets.value = allMarkets.filter(
			(market) => supportedMarkets[market.symbol],
		)

		markets.value.forEach((market) => {
			marketStore.setMarket({ target: market.symbol, symbol: market })
		})
		marketStore.isMarketsLoaded = true

		/** quotes */
		const prevWeekDt = DateTime.now()
			.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
			.minus({ day: 7 })
			.toISO()

		markets.value.forEach(async (market) => {
			const quotes = await fetchQuotesByMarket({
				id: market.id,
				limit: 1000,
			})
			marketStore.setQuotes({ target: market.symbol, quotes })

			/** weekly diff */
			const historyQuote = await fetchQuoteByTimestamp({
				id: market.id,
				ts: prevWeekDt,
			})
			marketStore.setHistoryPrice({
				target: market.symbol,
				price: historyQuote[0] ? historyQuote[0].price : 0,
			})

			/**
			 * Subscriptions
			 */

			/** Quotes */
			if (flameWager.gql) {
				pipe(
					flameWager.gql.subscription(QUOTES_SUBSCRIPTION, { currencyPairId: market.id }),
					subscribe((result) => {
						if (result.error) {
							console.error(`Quote subscription error for ${market.symbol}:`, result.error)
							return
						}
						const quote = result.data?.quotesWma?.[0]
						if (quote) {
							marketStore.updateQuotes({
								target: market.symbol,
								quote,
							})
						}
					})
				)
			}
		})
	}

	return { setupMarket, setupUser, updateWithdrawals, markets }
}
