<script>
import { defineComponent } from "vue"

/**
 * Base
 */
import Page from "@base/Page.vue"

/**
 * Module
 */
import LeaderboardBase from "@modules/leaderboard/LeaderboardBase.vue"
import ExploreBase from "@modules/explore/ExploreBase.vue"
export default defineComponent({
	name: "LeaderboardPage",

	components: { Page, LeaderboardBase, ExploreBase },
})
</script>

<template>
	<Page>
		<LeaderboardBase />
	</Page>
</template>

<style module>
.wrapper {
	max-width: 1250px;
}
</style>
