// src/store/wallet.js
import { defineStore } from 'pinia';
import { ethers } from 'ethers';
import { 
  getBalance,
  disconnect,
  connect,
  switchChain
} from '@wagmi/core';
import { injected, metaMask } from '@wagmi/vue/connectors'
import { config, activeRpcNode, activeChainConfig } from "@config";

export const useWalletStore = defineStore({
  id: 'wallet',

  state: () => ({
    provider: null,
    signer: null,
    pkh: "", // Using pkh instead of address for consistency
    chainId: null,
    balance: "0",
    isConnecting: false,

    pendingTransaction: {
      awaiting: false,
      when: null,
      hash: null
    },

    isPositionsLoading: false,
    positionsForWithdrawal: [],
    withdrawals: [],
    showOnboarding: false,
  }),

  getters: {
    isConnected: (state) => !!state.pkh,
    isLoggined: (state) => !!state.pkh,

    networkName: (state) => {
      if (!state.chainId) return 'Not Connected';
      
      switch (state.chainId) {
        case 127823:
          return "Etherlink Shadownet";
        default:
          return 'Unknown Network';
      }
    },

    wonPositions: (state) => {
      return state.positionsForWithdrawal.filter(position => position.value);
    }
  },

  actions: {
    async connectWallet() {
      try {
        this.isConnecting = true;

        // Connect using wagmi with metamask/injected connector
        const result = await connect(config, {
          chainId: activeChainConfig.id,
          connector: injected(),
        });

        if (!result.accounts.length) {
          throw new Error('Failed to connect wallet');
        }

        // Set address
        this.pkh = result.accounts[0];

        // Get and set network info
        this.chainId = activeChainConfig.id;

        // Get balance
        await this.refreshBalance();

        // // Save connection state
        // localStorage.setItem('wallet-autoconnect', 'true');

        return true;
      } catch (error) {
        console.error('Connection error:', error);
        throw error;
      } finally {
        this.isConnecting = false;
      }
    },

    async switchToFlameNetwork() {
      try {
        await switchChain(config, {
          chainId: activeChainConfig.id
        });
        return true;
      } catch (error) {
        console.error('Failed to switch networks:', error);
        return false;
      }
    },

    async logout() {
      try {
        // Disconnect using wagmi
        await disconnect();
        
        // Reset state
        this.handleDisconnect();
      } catch (error) {
        console.error('Logout error:', error);
      }
    },

    handleDisconnect() {
      // Reset all state
      this.provider = null;
      this.signer = null;
      this.pkh = "";
      this.chainId = null;
      this.balance = "0";
      this.positionsForWithdrawal = [];
      this.pendingTransaction = {
        awaiting: false,
        when: null,
        hash: null
      };
      
      // Clear local storage
      localStorage.removeItem('wallet-autoconnect');
    },

    async refreshBalance() {
      if (!this.pkh) return;

      try {
        const balanceData = await getBalance(config, {
          address: this.pkh,
          chainId: activeChainConfig.id,
        });

        this.balance = ethers.formatEther(balanceData.value);
      } catch (error) {
        console.error('Error fetching balance:', error);
        this.balance = "0";
      }
    },

    removePosition(id) {
      const positionIndex = this.positionsForWithdrawal.findIndex(pos => pos.id === id);
      if (positionIndex === -1) return;
      this.positionsForWithdrawal.splice(positionIndex, 1);
    },

    setPendingTransaction(hash) {
      this.pendingTransaction = {
        awaiting: true,
        when: Date.now(),
        hash
      };
    },

    clearPendingTransaction() {
      this.pendingTransaction = {
        awaiting: false,
        when: null,
        hash: null
      };
    },

    async init() {
      // Only try to connect if explicitly requested
      const shouldAutoConnect = localStorage.getItem('wallet-autoconnect') === 'true';
      if (shouldAutoConnect) {
        try {
          await this.connectWallet();
        } catch (error) {
          console.error('Auto-connect failed:', error);
          localStorage.removeItem('wallet-autoconnect');
        }
      }
    }
  }
});
