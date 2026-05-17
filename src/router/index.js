import { createRouter, createWebHistory } from 'vue-router'

/**
 * Store
 */
import { useAppStore } from "@store/app"
import { useAccountStore } from "@store/account"

// Lazy-load routes
const Home = () => import('../views/Home.vue')
const Events = () => import('../views/EventsPage.vue')
// const MyBets = () => import('../views/MyBets.vue')
const EventPage = () => import('../views/EventPage.vue')
const PoolsPage = () => import('../views/PoolsPage.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/events',
    name: 'Events',
    component: Events
  },
  {
    path: '/events/:id',
    name: 'EventPage',
    component: EventPage,
    props: true
  },
  {
    path: "/pools",
    name: "Liquidity Pools",
    component: PoolsPage,
  },
  // {
  //   path: '/my-bets',
  //   name: 'MyBets',
  //   component: MyBets
  // }
  {
    path: "/markets/:id",
    name: "Market",
    component: () => import("@views/MarketPage.vue"),
  },
  {
    path: "/rating",
    name: "Rating",
    alias: "/rank",
    component: () => import("@views/LeaderboardPage.vue"),
  },
  {
    path: "/markets",
    name: "Markets",
    component: () => import("@views/MarketsPage.vue"),
  },
  {
		path: "/profile",
		name: "MyProfile",
		beforeEnter: (to, from, next) => {
			const accountStore = useAccountStore()

			if (to.params.address) {
				next()
				return
			}

			if (accountStore.isLoggined) {
				next()
			} else {
				next({ name: "Explore" })
			}
		},
		component: () => import("@views/ProfilePage.vue"),
		children: [
			{
				path: ":address",
				name: "Profile",
				component: () => import("@views/ProfilePage.vue"),
			},
		],
	},
  {
    path: "/withdrawals",
    name: "Withdrawals",
    beforeEnter: (to, from, next) => {
      const accountStore = useAccountStore()
      if (accountStore.isLoggined) {
        next()
      } else {
        next({ name: "Explore" })
      }
    },
    component: () => import("@views/WithdrawalsPage.vue"),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((target, prev, next) => {
  const appStore = useAppStore()

  if (prev.name) appStore.prevRoute = prev

  next()
})

export default router 
