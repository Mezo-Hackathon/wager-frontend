import { http, createConfig } from '@wagmi/vue'
import { injected, metaMask, safe, walletConnect } from '@wagmi/vue/connectors'

// Get network type from environment variable
export const NETWORK_TYPE = import.meta.env.VITE_NETWORK_TYPE || 'testnet';
export const MUSD_ADDRESS = import.meta.env.VITE_MUSD_ADDRESS || "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503"
// const projectId = '<WALLETCONNECT_PROJECT_ID>'

export const chainConfig = {
  devnet: {
    id: 912559,
    name: 'Shadownet',
    network: 'devnet',
    nativeCurrency: {
      name: 'MUSD',
      symbol: 'MUSD',
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: ['https://node.shadownet.etherlink.com'],
        webSocket: ['wss://node.shadownet.etherlink.com'],
      },
      public: {
        http: ['https://node.shadownet.etherlink.com'],
        webSocket: ['wss://node.shadownet.etherlink.com'],
      },
    },
    blockExplorers: {
      default: { name: 'Shadownet Explorer', url: 'https://shadownet.explorer.etherlink.com' },
    },
  },
  testnet: {
    id: 31611,
    name: 'Mezo Testnet',
    network: 'testnet',
    nativeCurrency: {
      name: 'BTC',
      symbol: 'BTC',
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: ['https://rpc.test.mezo.org'],
        webSocket: [],
      },
      public: {
        http: ['https://rpc.test.mezo.org'],
        webSocket: [],
      },
    },
    blockExplorers: {
      default: { name: 'Mezo Explorer', url: 'https://explorer.test.mezo.org' },
    },
  },
};

// Get the active chain config based on environment
export const activeChainConfig = chainConfig[NETWORK_TYPE];

export const rpcNodes = {
  devnet: {
    url: chainConfig.devnet.rpcUrls.default,
    chainId: chainConfig.devnet.id,
    name: chainConfig.devnet.name,
    code: "devnet"
  },
  testnet: {
    url: chainConfig.testnet.rpcUrls.default,
    chainId: chainConfig.testnet.id,
    name: chainConfig.testnet.name,
    code: "testnet"
  },
};

// Get active RPC node based on environment
export const activeRpcNode = rpcNodes[NETWORK_TYPE];

// Create wagmi config with active chain
export const config = createConfig({
  chains: [activeChainConfig],
  connectors: [
    metaMask(),
    injected(),
    // walletConnect({ projectId }),
    safe(),
  ],
  transports: {
    [activeChainConfig.id]: http(activeChainConfig.rpcUrls.default.http)
  },
});

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || "http://localhost:8081/v1/graphql";
const GRAPHQL_WS = GRAPHQL_URL.replace(/^http/, 'ws');

export const dipdup = {
  mainnet: {
    graphql: GRAPHQL_URL,
    ws: GRAPHQL_WS,
  },
  testnet: {
    graphql: GRAPHQL_URL,
    ws: GRAPHQL_WS,
  },
}

export const supportedMarkets = {
  // "ETH-USD": { target: "Ethereum", description: "Ethereum / U.S. Dollar" },
  // "MEZO-USD": { target: "Mezo", description: "Mezo / U.S. Dollar" },
  "BTC-USD": { target: "Bitcoin", description: "Bitcoin / U.S. Dollar" },
}

export const sanity = {
  id: "2tokh3zd",
}

export const verifiedMakers = {
  testnet: [
    "0x6f8c8eb1d40cd2b9918334e7e82db9bc9df4e8b8",
    "0x1175d913615168da11eae920038e98b1bb620087",
  ],
  mainnet: [
    "0x6f8c8eb1d40cd2b9918334e7e82db9bc9df4e8b8",
  ],
}

export const contracts = {
  testnet: {
    oracle: "0xE7168A7f93208c18d74774692cB8014FEA345129",
    wager: "0x6752C64c9bf89e7869950B1380852a54eA608348",
    pool: "0x1175D913615168da11eAE920038e98b1BB620087",
  },
}
