/**
 * FlameWager SDK
 * Handles wallet connection, contract interactions, and GraphQL client for the MammothBet frontend
 */

/**
 * Vendor
 */
import { computed, reactive, markRaw } from "vue"
import { ethers } from "ethers"
import { switchChain, getAccount } from "@wagmi/core"
import { createClient } from "@urql/vue"
import {
  cacheExchange,
  fetchExchange,
  subscriptionExchange,
} from "@urql/core"
import { createClient as createWSClient } from 'graphql-ws';
import { print } from 'graphql';
import { config, activeRpcNode, NETWORK_TYPE, activeChainConfig, dipdup, contracts } from "@config"

/**
 * Services.Constants
 */
import { Networks } from "@/services/constants/networks"

/**
 * Contracts and ABIs
 */
import wagerABI from "@/contracts/abis/wager.json"
import poolABI from "@/contracts/abis/pool.json"
import erc20ABI from "@/contracts/abis/erc20.json"

import { Pool } from "./instruments/pool"

/**
 * Store
 */
const flameWager = reactive({
  provider: null,
  signer: null,
  core: null,
  musd: null,
  pools: {},
  address: null,
  network: NETWORK_TYPE,
  chainId: activeRpcNode.chainId,
  isConnected: false,
  gql: null, // GraphQL client
})

const currentNetwork = computed(() => {
  return activeChainConfig.network
})

// Set default network from environment
if (typeof localStorage !== 'undefined') {
  localStorage.activeNetwork = localStorage.activeNetwork || NETWORK_TYPE;

  // Validate "activeNetwork" (Integrity Repair)
  if (![Networks.MAINNET, Networks.TESTNET, Networks.DEVNET].includes(localStorage.activeNetwork)) {
    localStorage.activeNetwork = NETWORK_TYPE;
  }
}

/**
 * Initialize GraphQL client
 */
const init = () => {
  const networkKey = currentNetwork.value === 'mainnet' ? 'mainnet' : 'testnet'
  const graphqlConfig = dipdup[networkKey]
  const addresses = getContractAddresses()

  flameWager.core = markRaw(new ethers.Contract(
    addresses.wager,
    wagerABI,
    flameWager.signer
  ))

  const musdAddress = import.meta.env.VITE_MUSD_ADDRESS || "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503"
  flameWager.musd = markRaw(new ethers.Contract(
    musdAddress,
    erc20ABI,
    flameWager.signer
  ))

  if (!graphqlConfig) {
    console.warn("GraphQL configuration not found for network:", networkKey)
    return
  }

  try {
    const wsClient = createWSClient({
      url: graphqlConfig.ws,
    });

    flameWager.gql = markRaw(createClient({
      url: graphqlConfig.graphql,
      exchanges: [
        cacheExchange,
        subscriptionExchange({
          forwardSubscription: (request) => {
            const query = typeof request.query === 'string' ? request.query : print(request.query)
            const input = { query, variables: request.variables }
            return {
              subscribe: (sink) => {
                const isFunction = typeof sink === 'function';
                const safeSink = {
                  next: (val) => {
                    if (isFunction) sink(val);
                    else if (sink && typeof sink.next === 'function') sink.next(val);
                  },
                  error: (err) => {
                    console.error("GraphQL Subscription error:", err);
                    if (!isFunction && sink && typeof sink.error === 'function') {
                      try {
                        const cleanError = err instanceof Error ? err : new Error(err?.message || JSON.stringify(err) || "Subscription error");
                        sink.error(cleanError);
                      } catch (e) {
                        console.error("Failed to propagate subscription error to sink:", e);
                      }
                    }
                  },
                  complete: () => {
                    if (!isFunction && sink && typeof sink.complete === 'function') sink.complete();
                  }
                };
                const unsubscribe = wsClient.subscribe(input, safeSink)
                return { unsubscribe }
              },
            }
          },
        }),
        fetchExchange,
      ],
      fetchOptions: {
        method: "POST",
      },
    }));

    console.log("✅ GraphQL client initialized:", graphqlConfig.graphql)
  } catch (error) {
    console.error("Failed to initialize GraphQL client:", error)

    // Fallback: Create client without subscriptions
    flameWager.gql = markRaw(createClient({
      url: graphqlConfig.graphql,
    }))
  }
}

/**
 * Get contract addresses for current network
 */
const getContractAddresses = () => {
  const networkKey = currentNetwork.value === 'mainnet' ? 'mainnet' : 'testnet'
  return contracts[networkKey] || contracts.testnet
}

/**
 * Initialize pool contracts
 */
const initPools = (pools) => {
  // if (!flameWager.signer) {
  //   console.warn("Cannot initialize pools: no signer available")
  //   return
  // }

  pools.forEach(pool => {
    const contract = new ethers.Contract(
      pool.address,
      poolABI,
      flameWager.signer || flameWager.provider
    )
    flameWager.pools[pool.address] = markRaw(new Pool(pool.address, contract, flameWager.gql))
  })
}



/**
 * Initialize SDK with an external signer (from wagmi/account store)
 * This is the preferred method when using wagmi for wallet connection
 * @param {ethers.Signer} signer - The signer from wagmi/ethers
 * @param {string} address - The connected wallet address
 */
const initWithSigner = async (signer, address) => {
  if (!signer) {
    throw new Error("Signer is required")
  }

  try {
    flameWager.signer = markRaw(signer)
    flameWager.provider = markRaw(signer.provider)
    flameWager.address = address
    flameWager.isConnected = true

    // Re-initialize contracts with the new signer
    const addresses = getContractAddresses()

    if (addresses.wager) {
      flameWager.core = markRaw(new ethers.Contract(
        addresses.wager,
        wagerABI,
        flameWager.signer
      ))
    }

    // Re-initialize all loaded pools with the new signer
    Object.keys(flameWager.pools).forEach(poolAddress => {
      const contract = new ethers.Contract(
        poolAddress,
        poolABI,
        flameWager.signer
      )
      // We can reuse the existing Pool instance if we want, or create a new one.
      // Since Pool holds the contract reference, it's safer to create a new one to ensure state is clean.
      flameWager.pools[poolAddress] = markRaw(new Pool(poolAddress, contract, flameWager.gql))
    })

    const musdAddress = import.meta.env.VITE_MUSD_ADDRESS || "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503"
    flameWager.musd = markRaw(new ethers.Contract(
      musdAddress,
      erc20ABI,
      flameWager.signer
    ))

    console.log("✅ FlameWager SDK contracts connected to signer:", address)
  } catch (error) {
    console.error("Failed to initialize SDK with signer:", error)
    throw error
  }
}

/**
 * Switch to a different network
 */
const switchNetwork = async (network, router) => {
  if (![Networks.MAINNET, Networks.TESTNET, Networks.DEVNET].includes(network)) return

  try {
    // Try to switch to the network
    await switchChain(config, {
      chainId: chainConfig[network].id
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chainConfig[network]],
        })
      } catch (addError) {
        console.error(addError)
      }
    }
  }

  localStorage.activeNetwork = network

  // Reinitialize GraphQL for new network
  init()

  if (router) {
    router.push("/")
  }
}


/**
 * Utility function to destroy subscription
 * Kept for compatibility with old code
 */
const destroySubscription = (sub) => {
  if (sub && typeof sub.unsubscribe === 'function' && !sub.closed) {
    sub.unsubscribe()
  }
}

/**
 * Approve MUSD for betting/liquidity
 * @param {string} spenderAddress - The contract address to approve
 * @param {BigInt|string} amount - The amount to approve
 */
const approveMUSD = async (spenderAddress, amount) => {
  if (!flameWager.musd) throw new Error("MUSD contract not initialized");

  const allowance = await flameWager.musd.allowance(flameWager.address, spenderAddress);
  const requiredAmount = ethers.BigNumber ? ethers.BigNumber.from(amount.toString()) : ethers.toBigInt(amount.toString());
  const currentAllowance = ethers.BigNumber ? ethers.BigNumber.from(allowance.toString()) : ethers.toBigInt(allowance.toString());

  // If we're using ethers v6, operators are simple < or <=
  // Ethers v5 BigNumber has .lt()
  const isLessThan = currentAllowance.lt ? currentAllowance.lt(requiredAmount) : currentAllowance < requiredAmount;

  if (isLessThan) {
    const maxUint256 = ethers.constants ? ethers.constants.MaxUint256 : ethers.MaxUint256;
    const tx = await flameWager.musd.approve(spenderAddress, maxUint256);
    return tx.wait(); // Wait for approval to be mined
  }
  return true; // Already approved
}

/**
 * Place a bet on an event
 * @param {number} eventId - The event ID
 * @param {string} betType - "aboveEq" or "below"
 * @param {BigInt|string} amount - The bet amount in wei
 * @param {BigInt|string} minWinAmount - Minimum acceptable win amount in wei
 * @returns {Promise<ethers.TransactionResponse>}
 */
const placeBet = async (eventId, betType, amount, minWinAmount) => {
  if (!flameWager.core) {
    throw new Error("Contract not initialized. Please connect wallet first.")
  }

  // Convert betType string to uint8 (0 = ABOVE_EQ, 1 = BELOW)
  const betTypeNum = betType === "aboveEq" ? 0 : 1

  const tx = await flameWager.core.placeBet(
    eventId,
    betTypeNum,
    amount,
    minWinAmount
  )

  return tx
}

// Initialize GraphQL client on load
init()

/**
 * Retrieve the active account using Wagmi Core
 * @returns {Promise<{address: string}|null>}
 */
const getActiveAccount = async () => {
  const account = getAccount(config)
  if (account && account.isConnected && account.address) {
    return { address: account.address }
  }
  return null
}

export {
  flameWager,
  currentNetwork,
  switchNetwork,
  initPools,
  destroySubscription,
  getContractAddresses,
  approveMUSD,
  placeBet,
  initWithSigner,
  getActiveAccount,
}
