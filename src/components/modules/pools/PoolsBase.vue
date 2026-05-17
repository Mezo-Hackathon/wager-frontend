<script setup>
/**
 * Vendor
 */
import { ref, onMounted, onUnmounted, computed, watch } from "vue"
import { makeSummaryPosition } from "@/services/sdk/estimators"
import { useMeta } from "vue-meta"
import BN from "bignumber.js"

/**
 * Local
 */
import MyFunds from "./MyFunds.vue"
import MyStatistics from "./MyStatistics.vue"
import BottomInfo from "./BottomInfo.vue"
import PoolsStats from "./PoolsStats.vue"
import PoolsList from "./PoolsList.vue"

/**
 * UI
 */
import Block from "@ui/Block.vue"

/**
 * Modal
 */
import SharePoolModal from "@local/modals/pools/SharePoolModal.vue"
import PoolsModal from "@local/modals/pools/PoolsModal.vue"
import DepositModal from "@local/modals/pools/DepositModal.vue"
import RequestWithdrawModal from "@local/modals/pools/RequestWithdrawModal.vue"
import WithdrawClaimsModal from "@local/modals/pools/WithdrawClaimsModal.vue"
import TimelineModal from "@local/modals/pools/TimelineModal.vue"

/**
 * Services
 */
import { flags, updateFlag } from "@/services/flags"
import { flameWager as juster } from "@sdk"

/**
 * Models
 */
import { entryLiquidity as entryLiquidityModel, poolPosition as poolPositionModel, poolState as poolStateModel } from "@/graphql/models"

/**
 * Store
 */
import { useAccountStore } from "@store/account"
import { useNotificationsStore } from "@store/notifications"
import { useMarketStore } from "@store/market"

const accountStore = useAccountStore()
const notificationsStore = useNotificationsStore()
const marketStore = useMarketStore()

const showSharePoolModal = ref(false)
const showPoolsModal = ref(false)
const showTimelineModal = ref(false)
const showDepositModal = ref(false)
const showWithdrawClaimsModal = ref(false)
const showRequestWithdrawModal = ref(false)

const handleSelectPool = (pool) => {
	selectedPool.value = pool
	showPoolsModal.value = false
	showDepositModal.value = true
}

const handleShare = (pool) => {
	selectedPool.value = pool
	showSharePoolModal.value = true
}

const handleRequestWithdraw = (pool) => {
	selectedPool.value = pool
	showRequestWithdrawModal.value = true
}

const handleBackFromDeposit = () => {
	showDepositModal.value = false
	showPoolsModal.value = true
}

const handleWatchEvents = (pool) => {
	selectedPool.value = pool
	showTimelineModal.value = true
}

const handleClosePoolsWarning = () => {
	updateFlag("showGeneralPoolsWarning", false)

	notificationsStore.create({
		notification: {
			type: "success",
			title: "Warning is now hidden",
			autoDestroy: true,

			actions: [
				{
					name: "Undo",
					icon: "back",
					callback: () => {
						updateFlag("showGeneralPoolsWarning", true)
					},
				},
			],
		},
	})
}

/**
 * Pools
 */

const contracts = computed(() => Object.keys(juster.pools))
const pools = computed(() => marketStore.pools)
const selectedPool = ref({})

const isPopulated = ref(false)
const poolsStates = ref({})
const poolsAPY = ref({})

const summaries = computed(() => {
	const res = {}
	positions.value.forEach((pos) => {
		const state = poolsStates.value[pos.poolId]
		if (state) {
			res[pos.poolId] = makeSummaryPosition(pos, state)
		}
	})
	return res
})

/**
 * Pool Position
 */
const subPositions = ref({})
const positions = ref([])

/**
 * Entries
 */
const subEntries = ref({})
const entries = ref([])

/**
 * States
 */
const subStates = ref({})

const populatePools = async () => {
	for (const pool of pools.value) {
		const poolInstrument = juster.pools[pool.address]
		if (!poolInstrument) continue

		poolsStates.value[pool.address] = await poolInstrument.getLastPoolState()

		poolsAPY.value[pool.address] = (await poolInstrument.getAPY()).toNumber()
	}

	isPopulated.value = true

	setupSubToStates()
}

const setupSubToStates = async () => {
    pools.value.forEach(pool => {
        const poolInstrument = juster.pools[pool.address]
        if (!poolInstrument) return

        poolInstrument.subscribeToLastPoolState((newPoolState) => {
            const currentPoolState = poolsStates.value[newPoolState.poolId]

            if (newPoolState.counter === currentPoolState?.counter) return

            if (newPoolState.counter > (currentPoolState?.counter || 0)) {
                poolsStates.value[newPoolState.poolId] = newPoolState
            }
        })
    })
}

const setupSubToEntries = async () => {
	if (!juster.gql || !accountStore.pkh || !pools.value.length) return

	const query = `
		subscription WatchEntries($poolAddresses: [String!], $userAddress: String!) {
			entryLiquidity(where: {
				pool: { address: { _in: $poolAddresses } },
				user: { address: { _eq: $userAddress } }
			}) {
				acceptTime
				amount
				poolId
				poolEntryId
				entryId
				status
				pool {
					name
					entryLockPeriod
					address
				}
			}
		}
	`

	subEntries.value = juster.gql
		.subscription(query, {
			poolAddresses: pools.value.map((pool) => pool.address.toLowerCase()),
			userAddress: accountStore.pkh.toLowerCase(),
		})
		.subscribe({
			next: (result) => {
				if (result.data?.entryLiquidity) {
					entries.value = result.data.entryLiquidity
				}
			},
			error: console.error,
		})
}

const setupSubToPositions = async () => {
	if (!juster.gql || !accountStore.pkh) return

	const query = `
		subscription WatchPositions($userAddress: String!) {
			poolPosition(where: { userId: { _eq: $userAddress } }) {
				id
				poolId
				depositedAmount
				lockedEstimateAmount
				shares
				entrySharePrice
				withdrawnAmount
				realizedProfit
				withdrawnShares
				claims {
					amount
					id
					withdrawn
					eventId
					poolId
					event {
						result
						event {
							betsCloseTime
							measurePeriod
						}
					}
				}
				pool {
					name
				}
			}
		}
	`

	subPositions.value = juster.gql
		.subscription(query, {
			userAddress: accountStore.pkh.toLowerCase(),
		})
		.subscribe({
			next: (result) => {
				if (result.data?.poolPosition) {
					positions.value = result.data.poolPosition.map((p) => {
						return {
							...p,
							shares: BN(p.shares),
						}
					})
				}
			},
			error: console.error,
		})
}

const showAnimation = ref(false)
onMounted(() => {
	showAnimation.value = true

	if (Object.keys(juster.pools).length) {
		init()
	}
})

const isInited = ref(false)
const init = () => {
	isInited.value = true

	setupSubToEntries()
	setupSubToPositions()
	populatePools()
}

/**
 * Deposits with an amount <1 xtz need manual confirmation
 */
const handleManualEntryApprove = async (entry) => {
	const contract = await juster.sdk._tezos.contract.at(entry.pool.address)
	const transactions = [
		{
			kind: "transaction",
			...contract.methods.approveEntry(entry.entryId).toTransferParams(),
		},
	]

	const batch = await juster.sdk._tezos.wallet.batch(transactions)
	const batchOp = await batch.send()
}

onUnmounted(() => {
	if (Object.prototype.hasOwnProperty.call(subEntries.value, "_state") && !subEntries.value?.closed) {
		subEntries.value.unsubscribe()
	}

	if (Object.prototype.hasOwnProperty.call(subPositions.value, "_state") && !subPositions.value?.closed) {
		subPositions.value.unsubscribe()
	}

	if (Object.prototype.hasOwnProperty.call(subStates.value, "_state") && !subStates.value?.closed) {
		subStates.value.unsubscribe()
	}
})

// watch(
// 	() => isPopulated.value,
// 	() => {
// 		positions.value.forEach((pos) => {
// 			summaries.value[pos.poolId] = makeSummaryPosition(pos, poolsStates.value[pos.poolId])
// 		})
// 	},
// )

/** Wait for a long initialisation of the pools */
watch(
	() => contracts.value,
	() => {
		if (contracts.value.length >= 1 && !isInited.value) {
			init()
		}
	},
)

/** Meta */
const { meta } = useMeta({
	title: `Liquidity Pools`,
	description: "Liquidity Pools Managemenet",
})
</script>

<template>
	<transition name="slide">
		<div v-if="showAnimation" :class="$style.wrapper">
			<metainfo>
				<template v-slot:title="{ content }">{{ content }} • Juster</template>
			</metainfo>

			<!-- Modals -->
			<SharePoolModal :show="showSharePoolModal" :pool="selectedPool" @onClose="showSharePoolModal = false" />
			<PoolsModal
				v-if="pools.length"
				:show="showPoolsModal"
				:pools="pools"
				:poolsStates="poolsStates"
				:poolsAPY="poolsAPY"
				@onSelectPool="handleSelectPool"
				@onClose="showPoolsModal = false"
			/>
			<DepositModal
				:show="showDepositModal"
				:selectedPool="selectedPool"
				:state="poolsStates[selectedPool.address]"
				:apy="poolsAPY[selectedPool.address]"
				@onBack="handleBackFromDeposit"
				@onClose="showDepositModal = false"
			/>
			<RequestWithdrawModal
				:show="showRequestWithdrawModal"
				:selectedPool="selectedPool"
				:state="poolsStates[selectedPool.address]"
				:position="positions.find((pos) => pos.poolId === selectedPool.address)"
				@onClose="showRequestWithdrawModal = false"
			/>
			<WithdrawClaimsModal :show="showWithdrawClaimsModal" :positions="positions" @onClose="showWithdrawClaimsModal = false" />
			<TimelineModal :show="showTimelineModal" :pool="selectedPool" @onClose="showTimelineModal = false" />

			<Flex align="center" :class="$style.head">
				<h1 :class="$style.title">Liquidity Pools</h1>
			</Flex>

			<Flex justify="between" :class="$style.content">
				<Flex direction="column" gap="24" :class="$style.side">
					<MyFunds
						:pools="pools"
						:poolsStates="poolsStates"
						:entries="entries"
						:positions="positions"
						:summaries="summaries"
						:isReady="isPopulated"
						@onManualEntryApprove="handleManualEntryApprove"
						@onDepositLiquidity="showPoolsModal = true"
						@onGetClaims="showWithdrawClaimsModal = true"
					/>

					<MyStatistics
						v-if="accountStore.pkh"
						:positions="positions"
						:poolsAPY="poolsAPY"
						:poolsStates="poolsStates"
						:summaries="summaries"
						:isReady="isPopulated"
					/>

					<BottomInfo v-if="pools.length" :pool="pools[0]" :class="$style.bottom_left_block" />
				</Flex>

				<Flex direction="column" gap="24" wide :class="$style.base">
					<PoolsStats :pools="pools" :poolsStates="poolsStates" :poolsAPY="poolsAPY" />

					<Block v-if="flags.showGeneralPoolsWarning" @onClose="handleClosePoolsWarning">
						<span>Current APYs is approximate.</span> Values may change over the next few months. Planning for long-term income
						based on these values may differ from the actual.
					</Block>

					<transition name="fade">
						<PoolsList
							v-if="pools.length"
							:pools="pools"
							:poolsStates="poolsStates"
							:poolsAPY="poolsAPY"
							:positions="positions"
							@onShare="(pool) => handleShare(pool)"
							@onSelectPool="handleSelectPool"
							@onWatchEvents="(pool) => handleWatchEvents(pool)"
							@onRequestWithdraw="handleRequestWithdraw"
							:class="$style.list"
						/>
					</transition>

					<BottomInfo v-if="pools.length" :pool="pools[0]" :class="$style.bottom_right_block" />
				</Flex>
			</Flex>
		</div>
	</transition>
</template>

<style module>
.wrapper {
}

.title {
	font-size: 16px;
}

.head {
	border-bottom: 1px solid var(--border);

	padding-bottom: 16px;
	margin-bottom: 24px;
}

.side {
	max-width: 450px;
}

.base {
	max-width: 760px;

	margin-left: 32px;
}

.list {
	margin-top: 32px;
}

.bottom_right_block {
	display: none;
}

@media (max-width: 1000px) {
	.content {
		flex-direction: column;

		gap: 40px;
	}

	.bottom_left_block {
		display: none;
	}

	.bottom_right_block {
		display: flex;
	}

	.side {
		max-width: initial;

		position: initial;
	}

	.base {
		margin: 0;
		max-width: initial;
	}
}
</style>
