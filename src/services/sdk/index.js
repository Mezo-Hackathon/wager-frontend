import {
  flameWager,
  switchNetwork,
  currentNetwork,
  initPools,
  destroySubscription,
  initWithSigner,
  placeBet,
  getContractAddresses,
  approveMUSD,
} from "./flameWager"
import analytics from "./analytics"
import { withdraw, withdrawAll } from "./withdraw"
import { getBalance } from "@wagmi/core"
import { ethers } from "ethers"
import { config, activeChainConfig } from "@config"

/**
 * Utility function to fetch balance for a given address
 * @param {string} address - The wallet address to fetch balance for
 * @returns {Promise<string>} The balance in ETH as a string
 */
export async function fetchBalance(address) {

  if (!address) return "0"

  try {
    const balanceData = await getBalance(config, {
      address,
      chainId: activeChainConfig.id,
    })

    return ethers.formatEther(balanceData.value)
  } catch (error) {
    console.error("Error fetching balance:", error)
    return "0"
  }
}

export {
  flameWager,
  switchNetwork,
  currentNetwork,
  initPools,
  destroySubscription,
  getContractAddresses,
  approveMUSD,
  placeBet,
  initWithSigner,
  analytics,
  withdraw,
  withdrawAll
}
