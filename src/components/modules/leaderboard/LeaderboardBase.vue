<script>
import { defineComponent, ref, reactive, computed, onMounted, watch } from "vue"
import { useMeta } from "vue-meta"
import { useRouter } from "vue-router"

/**
 * Services & API
 */
import { fetchLeaderboard } from "@/api/users"
import { numberWithSymbol } from "@utils/amounts"

export default defineComponent({
	name: "LeaderboardBase",

	setup() {
		const router = useRouter()
		const activeTab = ref("bettors") // "bettors" | "providers"
		const loading = ref(true)
		const searchQuery = ref("")
		const copiedAddress = ref("")

		const bettors = ref([])
		const providers = ref([])

		const sort = reactive({
			bettors: {
				column: "winnings", // "winnings" | "betsCount" | "betsAmount" | "roi"
				dir: "desc",
			},
			providers: {
				column: "combinedTvl", // "combinedTvl" | "liquidity" | "poolDeposits" | "earned"
				dir: "desc",
			},
		})

		const loadData = async () => {
			loading.value = true
			try {
				if (activeTab.value === "bettors") {
					bettors.value = await fetchLeaderboard({ limit: 100, type: "bettors" })
				} else {
					providers.value = await fetchLeaderboard({ limit: 100, type: "providers" })
				}
			} catch (error) {
				console.error("Error loading leaderboard data:", error)
			} finally {
				loading.value = false
			}
		}

		onMounted(() => {
			loadData()
		})

		watch(activeTab, () => {
			searchQuery.value = ""
			loadData()
		})

		const sortBy = (tab, column) => {
			const sortState = sort[tab]
			if (sortState.column === column) {
				sortState.dir = sortState.dir === "desc" ? "asc" : "desc"
			} else {
				sortState.column = column
				sortState.dir = "desc"
			}
		}

		// Helper to shorten wallet addresses
		const shortenAddress = (address) => {
			if (!address) return ""
			return `${address.slice(0, 6)}...${address.slice(-4)}`
		}

		// Copy wallet address helper
		const copyToClipboard = (address, event) => {
			event.stopPropagation()
			navigator.clipboard.writeText(address)
			copiedAddress.value = address
			setTimeout(() => {
				if (copiedAddress.value === address) {
					copiedAddress.value = ""
				}
			}, 1500)
		}

		// Click-to-profile handler
		const viewProfile = (address) => {
			router.push(`/profile/${address}`)
		}

		// Dynamic user avatar helper using address hash to generate a beautiful gradient
		const getAvatarGradient = (address) => {
			if (!address) return "linear-gradient(135deg, #111, #222)"
			const colors = [
				"#f43f5e", "#ec4899", "#d946ef", "#a855f7", 
				"#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9", 
				"#06b6d4", "#14b8a6", "#10b981", "#22c55e", 
				"#84cc16", "#eab308", "#f97316"
			]
			const hash = address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
			const c1 = colors[hash % colors.length]
			const c2 = colors[(hash + 6) % colors.length]
			return `linear-gradient(135deg, ${c1}, ${c2})`
		}

		// Computed filtered and sorted bettors list
		const sortedBettors = computed(() => {
			let list = [...bettors.value]

			if (searchQuery.value) {
				const q = searchQuery.value.toLowerCase()
				list = list.filter((u) => u.address.toLowerCase().includes(q))
			}

			const { column, dir } = sort.bettors
			list.sort((a, b) => {
				let valA = 0
				let valB = 0

				if (column === "winnings") {
					valA = parseFloat(a.totalWinnings || 0)
					valB = parseFloat(b.totalWinnings || 0)
				} else if (column === "betsCount") {
					valA = parseInt(a.totalBetsCount || 0)
					valB = parseInt(b.totalBetsCount || 0)
				} else if (column === "betsAmount") {
					valA = parseFloat(a.totalBetsAmount || 0)
					valB = parseFloat(b.totalBetsAmount || 0)
				} else if (column === "roi") {
					const roiA = parseFloat(a.totalBetsAmount || 0) > 0 
						? (parseFloat(a.totalWinnings || 0) / parseFloat(a.totalBetsAmount || 0)) * 100 
						: 0
					const roiB = parseFloat(b.totalBetsAmount || 0) > 0 
						? (parseFloat(b.totalWinnings || 0) / parseFloat(b.totalBetsAmount || 0)) * 100 
						: 0
					valA = roiA
					valB = roiB
				}

				return dir === "desc" ? valB - valA : valA - valB
			})

			return list
		})

		// Computed filtered and sorted providers list
		const sortedProviders = computed(() => {
			let list = [...providers.value]

			if (searchQuery.value) {
				const q = searchQuery.value.toLowerCase()
				list = list.filter((u) => u.address.toLowerCase().includes(q))
			}

			const { column, dir } = sort.providers
			list.sort((a, b) => {
				let valA = 0
				let valB = 0

				if (column === "liquidity") {
					valA = parseFloat(a.totalLiquidityProvided || 0)
					valB = parseFloat(b.totalLiquidityProvided || 0)
				} else if (column === "poolDeposits") {
					valA = parseFloat(a.totalPoolDeposits || 0)
					valB = parseFloat(b.totalPoolDeposits || 0)
				} else if (column === "combinedTvl") {
					valA = parseFloat(a.totalLiquidityProvided || 0) + parseFloat(a.totalPoolDeposits || 0)
					valB = parseFloat(b.totalLiquidityProvided || 0) + parseFloat(b.totalPoolDeposits || 0)
				} else if (column === "earned") {
					valA = parseFloat(a.totalWinnings || 0)
					valB = parseFloat(b.totalWinnings || 0)
				}

				return dir === "desc" ? valB - valA : valA - valB
			})

			return list
		})

		// Dynamic overview stat blocks based on current tab selection
		const overviewStats = computed(() => {
			if (activeTab.value === "bettors") {
				const totalVol = bettors.value.reduce((acc, u) => acc + parseFloat(u.totalBetsAmount || 0), 0)
				const totalWinnings = bettors.value.reduce((acc, u) => acc + parseFloat(u.totalWinnings || 0), 0)
				return {
					count: bettors.value.length,
					countLabel: "Active Bettors",
					metric1: `${numberWithSymbol(totalVol.toFixed(2), ",")}`,
					metric1Label: "Betting Volume (MUSD)",
					metric2: `${numberWithSymbol(totalWinnings.toFixed(2), ",")}`,
					metric2Label: "Total Winnings (MUSD)"
				}
			} else {
				const totalLP = providers.value.reduce((acc, u) => acc + parseFloat(u.totalLiquidityProvided || 0), 0)
				const totalPool = providers.value.reduce((acc, u) => acc + parseFloat(u.totalPoolDeposits || 0), 0)
				const totalCombined = totalLP + totalPool
				return {
					count: providers.value.length,
					countLabel: "Active Providers",
					metric1: `${numberWithSymbol(totalCombined.toFixed(2), ",")}`,
					metric1Label: "Combined TVL (MUSD)",
					metric2: `${numberWithSymbol(totalLP.toFixed(2), ",")}`,
					metric2Label: "Event LP Provided (MUSD)"
				}
			}
		})

		useMeta({
			title: "Leaderboard",
			description: "MammothBet active users and liquidity provider rankings",
		})

		return {
			activeTab,
			loading,
			searchQuery,
			copiedAddress,
			sort,
			sortBy,
			shortenAddress,
			copyToClipboard,
			viewProfile,
			getAvatarGradient,
			sortedBettors,
			sortedProviders,
			overviewStats,
			numberWithSymbol,
		}
	},
})
</script>

<template>
	<div :class="$style.wrapper">
		<metainfo>
			<template v-slot:title="{ content }">{{ content }} • MammothBet</template>
		</metainfo>

		<div :class="$style.header_section">
			<div>
				<h1>Leaderboard</h1>
				<div :class="$style.description">
					Real-time rankings of top performing bet makers and liquidity pool depositors on Mezo.
				</div>
			</div>

			<!-- Dynamic Tab Switchers -->
			<div :class="$style.tab_container">
				<button 
					:class="[$style.tab_btn, activeTab === 'bettors' && $style.tab_btn_active]"
					@click="activeTab = 'bettors'"
				>
					<Icon name="event_active" size="14" :color="activeTab === 'bettors' ? 'primary' : 'tertiary'" />
					🏆 Top Bettors
				</button>
				<button 
					:class="[$style.tab_btn, activeTab === 'providers' && $style.tab_btn_active]"
					@click="activeTab = 'providers'"
				>
					<Icon name="pool" size="14" :color="activeTab === 'providers' ? 'primary' : 'tertiary'" />
					💧 Liquidity Providers
				</button>
			</div>
		</div>

		<!-- Overview Stat Cards -->
		<div :class="$style.stats_grid">
			<div :class="$style.stat_card">
				<div :class="$style.stat_label">{{ overviewStats.countLabel }}</div>
				<div :class="$style.stat_value">{{ overviewStats.count }}</div>
			</div>
			<div :class="$style.stat_card">
				<div :class="$style.stat_label">{{ overviewStats.metric1Label }}</div>
				<div :class="$style.stat_value">{{ overviewStats.metric1 }}</div>
			</div>
			<div :class="$style.stat_card">
				<div :class="$style.stat_label">{{ overviewStats.metric2Label }}</div>
				<div :class="$style.stat_value">{{ overviewStats.metric2 }}</div>
			</div>
		</div>

		<!-- Control Toolbar -->
		<div :class="$style.controls">
			<div :class="$style.search_bar">
				<Icon name="search" size="16" color="tertiary" :class="$style.search_icon" />
				<input 
					v-model="searchQuery" 
					placeholder="Search wallet address..." 
					:class="$style.search_input"
				/>
				<button 
					v-if="searchQuery" 
					:class="$style.clear_btn" 
					@click="searchQuery = ''"
				>
					✕
				</button>
			</div>
		</div>

		<!-- Leaderboard Table Container -->
		<div :class="$style.leaderboard">
			<!-- Loading State -->
			<div v-if="loading" :class="$style.loading_state">
				<Spin size="24" />
				<span>Fetching indexer updates...</span>
			</div>

			<!-- Empty State -->
			<div 
				v-else-if="activeTab === 'bettors' && sortedBettors.length === 0" 
				:class="$style.empty_state"
			>
				<Icon name="help" size="32" />
				<h3>No wagers found</h3>
				<p>Active participants who place event wagers will be listed here.</p>
			</div>

			<div 
				v-else-if="activeTab === 'providers' && sortedProviders.length === 0" 
				:class="$style.empty_state"
			>
				<Icon name="help" size="32" />
				<h3>No liquidity providers found</h3>
				<p>Active users providing pool or event liquidity will appear here.</p>
			</div>

			<!-- Main Real-time Bettors Table -->
			<table v-else-if="activeTab === 'bettors'" :class="$style.table">
				<thead>
					<tr>
						<th style="max-width: 80px; width: 80px;">Rank</th>
						<th>Participant</th>
						<th @click="sortBy('bettors', 'betsCount')" :class="$style.sortable_th">
							Wagers Placed
							<Icon 
								name="arrow_down" 
								size="10" 
								:color="sort.bettors.column === 'betsCount' ? 'primary' : 'tertiary'"
								:class="[
									$style.sort_icon, 
									sort.bettors.column === 'betsCount' && $style.sort_active,
									sort.bettors.column === 'betsCount' && sort.bettors.dir === 'asc' && $style.sort_asc
								]"
							/>
						</th>
						<th @click="sortBy('bettors', 'betsAmount')" :class="$style.sortable_th">
							Wager Volume
							<Icon 
								name="arrow_down" 
								size="10" 
								:color="sort.bettors.column === 'betsAmount' ? 'primary' : 'tertiary'"
								:class="[
									$style.sort_icon, 
									sort.bettors.column === 'betsAmount' && $style.sort_active,
									sort.bettors.column === 'betsAmount' && sort.bettors.dir === 'asc' && $style.sort_asc
								]"
							/>
						</th>
						<th @click="sortBy('bettors', 'winnings')" :class="$style.sortable_th">
							Total Winnings
							<Icon 
								name="arrow_down" 
								size="10" 
								:color="sort.bettors.column === 'winnings' ? 'primary' : 'tertiary'"
								:class="[
									$style.sort_icon, 
									sort.bettors.column === 'winnings' && $style.sort_active,
									sort.bettors.column === 'winnings' && sort.bettors.dir === 'asc' && $style.sort_asc
								]"
							/>
						</th>
						<th @click="sortBy('bettors', 'roi')" :class="$style.sortable_th">
							Performance (ROI)
							<Icon 
								name="arrow_down" 
								size="10" 
								:color="sort.bettors.column === 'roi' ? 'primary' : 'tertiary'"
								:class="[
									$style.sort_icon, 
									sort.bettors.column === 'roi' && $style.sort_active,
									sort.bettors.column === 'roi' && sort.bettors.dir === 'asc' && $style.sort_asc
								]"
							/>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr 
						v-for="(user, index) in sortedBettors" 
						:key="user.address"
						@click="viewProfile(user.address)"
						:class="$style.table_row"
					>
						<td>
							<div :class="$style.rank_container">
								<span v-if="index === 0" :class="[$style.rank_badge, $style.rank_gold]">🥇</span>
								<span v-else-if="index === 1" :class="[$style.rank_badge, $style.rank_silver]">🥈</span>
								<span v-else-if="index === 2" :class="[$style.rank_badge, $style.rank_bronze]">🥉</span>
								<span v-else :class="$style.rank_number">#{{ index + 1 }}</span>
							</div>
						</td>
						<td>
							<div :class="$style.user_info">
								<div 
									:class="$style.user_avatar"
									:style="{ background: getAvatarGradient(user.address) }"
								/>
								<div :class="$style.address_box">
									<span :class="$style.address_text">{{ shortenAddress(user.address) }}</span>
									<button 
										:class="$style.copy_btn"
										@click="copyToClipboard(user.address, $event)"
									>
										<Icon 
											:name="copiedAddress === user.address ? 'check' : 'copy'" 
											size="12" 
											:color="copiedAddress === user.address ? 'green' : 'tertiary'"
										/>
									</button>
								</div>
							</div>
						</td>
						<td>{{ user.totalBetsCount }}</td>
						<td>{{ numberWithSymbol(parseFloat(user.totalBetsAmount || 0).toFixed(2), ",") }} MUSD</td>
						<td>
							<span :class="$style.winnings_text">
								+{{ numberWithSymbol(parseFloat(user.totalWinnings || 0).toFixed(2), ",") }} MUSD
							</span>
						</td>
						<td>
							<span 
								:class="[
									$style.perf_text, 
									parseFloat(user.totalWinnings || 0) > parseFloat(user.totalBetsAmount || 0) ? $style.perf_positive : $style.perf_neutral
								]"
							>
								{{ 
									parseFloat(user.totalBetsAmount || 0) > 0 
										? ((parseFloat(user.totalWinnings || 0) / parseFloat(user.totalBetsAmount || 0)) * 100).toFixed(1)
										: "0.0"
								}}%
							</span>
						</td>
					</tr>
				</tbody>
			</table>

			<!-- Main Real-time Liquidity Providers Table -->
			<table v-else-if="activeTab === 'providers'" :class="$style.table">
				<thead>
					<tr>
						<th style="max-width: 80px; width: 80px;">Rank</th>
						<th>Provider</th>
						<th @click="sortBy('providers', 'liquidity')" :class="$style.sortable_th">
							Event Liquidity
							<Icon 
								name="arrow_down" 
								size="10" 
								:color="sort.providers.column === 'liquidity' ? 'primary' : 'tertiary'"
								:class="[
									$style.sort_icon, 
									sort.providers.column === 'liquidity' && $style.sort_active,
									sort.providers.column === 'liquidity' && sort.providers.dir === 'asc' && $style.sort_asc
								]"
							/>
						</th>
						<th @click="sortBy('providers', 'poolDeposits')" :class="$style.sortable_th">
							Pool Deposits
							<Icon 
								name="arrow_down" 
								size="10" 
								:color="sort.providers.column === 'poolDeposits' ? 'primary' : 'tertiary'"
								:class="[
									$style.sort_icon, 
									sort.providers.column === 'poolDeposits' && $style.sort_active,
									sort.providers.column === 'poolDeposits' && sort.providers.dir === 'asc' && $style.sort_asc
								]"
							/>
						</th>
						<th @click="sortBy('providers', 'combinedTvl')" :class="$style.sortable_th">
							Combined LP Position
							<Icon 
								name="arrow_down" 
								size="10" 
								:color="sort.providers.column === 'combinedTvl' ? 'primary' : 'tertiary'"
								:class="[
									$style.sort_icon, 
									sort.providers.column === 'combinedTvl' && $style.sort_active,
									sort.providers.column === 'combinedTvl' && sort.providers.dir === 'asc' && $style.sort_asc
								]"
							/>
						</th>
						<th @click="sortBy('providers', 'earned')" :class="$style.sortable_th">
							Earned Rewards
							<Icon 
								name="arrow_down" 
								size="10" 
								:color="sort.providers.column === 'earned' ? 'primary' : 'tertiary'"
								:class="[
									$style.sort_icon, 
									sort.providers.column === 'earned' && $style.sort_active,
									sort.providers.column === 'earned' && sort.providers.dir === 'asc' && $style.sort_asc
								]"
							/>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr 
						v-for="(user, index) in sortedProviders" 
						:key="user.address"
						@click="viewProfile(user.address)"
						:class="$style.table_row"
					>
						<td>
							<div :class="$style.rank_container">
								<span v-if="index === 0" :class="[$style.rank_badge, $style.rank_gold]">🥇</span>
								<span v-else-if="index === 1" :class="[$style.rank_badge, $style.rank_silver]">🥈</span>
								<span v-else-if="index === 2" :class="[$style.rank_badge, $style.rank_bronze]">🥉</span>
								<span v-else :class="$style.rank_number">#{{ index + 1 }}</span>
							</div>
						</td>
						<td>
							<div :class="$style.user_info">
								<div 
									:class="$style.user_avatar"
									:style="{ background: getAvatarGradient(user.address) }"
								/>
								<div :class="$style.address_box">
									<span :class="$style.address_text">{{ shortenAddress(user.address) }}</span>
									<button 
										:class="$style.copy_btn"
										@click="copyToClipboard(user.address, $event)"
									>
										<Icon 
											:name="copiedAddress === user.address ? 'check' : 'copy'" 
											size="12" 
											:color="copiedAddress === user.address ? 'green' : 'tertiary'"
										/>
									</button>
								</div>
							</div>
						</td>
						<td>{{ numberWithSymbol(parseFloat(user.totalLiquidityProvided || 0).toFixed(2), ",") }} MUSD</td>
						<td>{{ numberWithSymbol(parseFloat(user.totalPoolDeposits || 0).toFixed(2), ",") }} MUSD</td>
						<td>
							<span :class="$style.combined_tvl_text">
								{{ 
									numberWithSymbol(
										(parseFloat(user.totalLiquidityProvided || 0) + parseFloat(user.totalPoolDeposits || 0)).toFixed(2), 
										","
									) 
								}} MUSD
							</span>
						</td>
						<td>
							<span :class="$style.earned_text">
								+{{ numberWithSymbol(parseFloat(user.totalWinnings || 0).toFixed(2), ",") }} MUSD
							</span>
						</td>
					</tr>
				</tbody>
			</table>

			<div :class="$style.bottom">
				<span>Showing top active addresses</span>
				<span>Synced in real-time</span>
			</div>
		</div>
	</div>
</template>

<style module>
.wrapper {
	max-width: 1200px;
	margin: 0 auto;
	padding: 24px 0;
}

.header_section {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	margin-bottom: 32px;
	flex-wrap: wrap;
	gap: 20px;
}

.header_section h1 {
	font-size: 32px;
	font-weight: 700;
	color: var(--text-primary);
	margin: 0 0 8px 0;
}

.description {
	font-size: 14px;
	line-height: 1.5;
	font-weight: 500;
	color: var(--text-tertiary);
}

/* Tabs styles */
.tab_container {
	display: flex;
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid var(--border);
	padding: 4px;
	border-radius: 12px;
	backdrop-filter: blur(10px);
}

.tab_btn {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 16px;
	border-radius: 8px;
	border: none;
	background: transparent;
	color: var(--text-secondary);
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab_btn:hover {
	color: var(--text-primary);
}

.tab_btn_active {
	background: rgba(255, 255, 255, 0.08);
	color: var(--text-white);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Stats grid */
.stats_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: 20px;
	margin-bottom: 32px;
}

.stat_card {
	background: rgba(255, 255, 255, 0.02);
	border: 1px solid var(--border);
	border-radius: 16px;
	padding: 24px;
	display: flex;
	flex-direction: column;
	position: relative;
	overflow: hidden;
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat_card:hover {
	transform: translateY(-2px);
	box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
	background: rgba(255, 255, 255, 0.03);
}

.stat_label {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-tertiary);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin-bottom: 12px;
}

.stat_value {
	font-size: 28px;
	font-weight: 700;
	color: var(--text-white);
	margin-bottom: 12px;
	line-height: 1;
}

.stat_badge {
	font-size: 11px;
	font-weight: 600;
	color: var(--brand);
	background: rgba(255, 255, 255, 0.05);
	padding: 4px 8px;
	border-radius: 6px;
	width: fit-content;
}

/* Controls Toolbar */
.controls {
	display: flex;
	justify-content: flex-end;
	margin-bottom: 20px;
}

.search_bar {
	display: flex;
	align-items: center;
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid var(--border);
	border-radius: 10px;
	padding: 0 12px;
	width: 320px;
	height: 40px;
	transition: border-color 0.2s ease;
}

.search_bar:focus-within {
	border-color: rgba(255, 255, 255, 0.2);
}

.search_icon {
	color: var(--text-tertiary);
	margin-right: 8px;
}

.search_input {
	flex: 1;
	background: transparent;
	border: none;
	outline: none;
	color: var(--text-primary);
	font-size: 13px;
	font-weight: 500;
}

.search_input::placeholder {
	color: var(--text-tertiary);
}

.clear_btn {
	background: transparent;
	border: none;
	color: var(--text-tertiary);
	cursor: pointer;
	font-size: 12px;
	padding: 4px;
}

.clear_btn:hover {
	color: var(--text-primary);
}

/* Table container */
.leaderboard {
	background: rgba(255, 255, 255, 0.01);
	border: 1px solid var(--border);
	border-radius: 16px;
	overflow: hidden;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.table {
	width: 100%;
	border-collapse: collapse;
	text-align: left;
}

.table th {
	padding: 18px 24px;
	font-size: 11px;
	font-weight: 700;
	text-transform: uppercase;
	color: var(--text-tertiary);
	border-bottom: 1px solid var(--border);
	letter-spacing: 0.5px;
}

.sortable_th {
	cursor: pointer;
	user-select: none;
	transition: color 0.2s ease;
}

.sortable_th:hover {
	color: var(--text-primary);
}

.sort_icon {
	margin-left: 6px;
	opacity: 0.3;
	transition: all 0.2s ease;
	vertical-align: middle;
}

.sort_active {
	opacity: 1;
	fill: var(--text-white);
}

.sort_asc {
	transform: rotate(180deg);
}

.table_row {
	cursor: pointer;
	border-bottom: 1px solid var(--border);
	transition: background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.table_row:hover {
	background-color: rgba(255, 255, 255, 0.02);
}

.table_row:last-child {
	border-bottom: none;
}

.table td {
	padding: 18px 24px;
	font-size: 14px;
	font-weight: 600;
	color: var(--text-primary);
	vertical-align: middle;
}

/* Rank column */
.rank_container {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
}

.rank_badge {
	font-size: 20px;
}

.rank_number {
	font-size: 13px;
	color: var(--text-tertiary);
}

/* User identity */
.user_info {
	display: flex;
	align-items: center;
	gap: 12px;
}

.user_avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	flex-shrink: 0;
	box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
}

.address_box {
	display: flex;
	align-items: center;
	gap: 6px;
}

.address_text {
	font-family: monospace;
	font-size: 14px;
	font-weight: 600;
}

.copy_btn {
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 4px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: opacity 0.2s ease, background 0.2s ease;
}

.table_row:hover .copy_btn {
	opacity: 1;
}

.copy_btn:hover {
	background: rgba(255, 255, 255, 0.05);
}

/* Numeric text styles */
.winnings_text {
	color: #10b981;
}

.combined_tvl_text {
	color: var(--text-white);
}

.earned_text {
	color: #10b981;
}

.perf_text {
	padding: 4px 8px;
	border-radius: 6px;
	font-size: 12px;
	font-weight: 700;
}

.perf_positive {
	background: rgba(16, 185, 129, 0.1);
	color: #10b981;
}

.perf_neutral {
	background: rgba(255, 255, 255, 0.05);
	color: var(--text-secondary);
}

/* Loading & empty states */
.loading_state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16px;
	padding: 64px 0;
	color: var(--text-secondary);
	font-weight: 500;
}

.empty_state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	padding: 64px 24px;
}

.empty_state h3 {
	margin: 16px 0 8px 0;
	color: var(--text-white);
}

.empty_state p {
	color: var(--text-tertiary);
	font-size: 13px;
	max-width: 320px;
	margin: 0;
}

.bottom {
	display: flex;
	justify-content: space-between;
	font-size: 11px;
	font-weight: 600;
	color: var(--text-tertiary);
	padding: 18px 24px;
	border-top: 1px solid var(--border);
	background: rgba(0, 0, 0, 0.05);
}

/* Responsive adjustment */
@media (max-width: 768px) {
	.header_section {
		flex-direction: column;
		align-items: flex-start;
	}
	
	.tab_container {
		width: 100%;
	}
	
	.tab_btn {
		flex: 1;
		justify-content: center;
	}

	.search_bar {
		width: 100%;
	}
}
</style>
