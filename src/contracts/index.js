import JusterCoreABI from './abis/JusterCore.json'
import JusterPoolABI from './abis/JusterPool.json'
import ChainlinkPriceOracleABI from './abis/ChainlinkPriceOracle.json'

// Contract addresses - these should be updated after deployment
const ADDRESSES = {
  // Development addresses (hardhat)
  development: {
    JusterCore: '0xc786c862682F3CAa00f9460e5f4F672444aBA41c',
    JusterPool: '0x451aCE7b6473BDecfC32f757c015bF7587893cE0',
    ChainlinkPriceOracle: '0xC56684d7B3414880c8A035aeFcE0ca1fC7d2296A'
  },
  // Testnet addresses
  testnet: {
    JusterCore: '0xc786c862682F3CAa00f9460e5f4F672444aBA41c',
    JusterPool: '0x451aCE7b6473BDecfC32f757c015bF7587893cE0',
    ChainlinkPriceOracle: '0xC56684d7B3414880c8A035aeFcE0ca1fC7d2296A'
  },
  // Mainnet addresses
  mainnet: {
    JusterCore: '',
    JusterPool: '',
    ChainlinkPriceOracle: ''
  }
}

// Get the network environment from the .env file
const NETWORK_ENV = import.meta.env.VITE_NETWORK_ENV || 'development'

// Export contract ABIs
export const ABIs = {
  JusterCore: JusterCoreABI,
  JusterPool: JusterPoolABI,
  ChainlinkPriceOracle: ChainlinkPriceOracleABI
}

// Export contract addresses for the current network
export const CONTRACT_ADDRESSES = ADDRESSES[NETWORK_ENV]

// Export a function to get a contract instance
export const getContractInstance = (contractName, provider) => {
  const ethers = require('ethers')
  const abi = ABIs[contractName]
  const address = CONTRACT_ADDRESSES[contractName]

  if (!abi) {
    throw new Error(`ABI for ${contractName} not found`)
  }

  if (!address) {
    throw new Error(`Address for ${contractName} not found on ${NETWORK_ENV} network`)
  }

  return new ethers.Contract(address, abi, provider)
} 
