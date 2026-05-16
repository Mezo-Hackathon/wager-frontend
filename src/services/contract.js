// src/services/contracts.js
import { ethers } from 'ethers';
import JusterCoreABI from '@/abis/JusterCore.json';
import JusterPoolABI from '@/abis/JusterPool.json';
import PriceOracleABI from '@/abis/PriceOracle.json';

// Contract addresses for Flame devnet
const ADDRESSES = {
  JusterCore: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Update with real address
  JusterPool: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // Update with real address
  PriceOracle: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" // Update with real address
};

export class ContractService {
  constructor(provider, signer = null) {
    this.provider = provider;
    this.signer = signer;
    
    // Initialize contracts
    this.initContracts();
  }
  
  initContracts() {
    // Read-only contracts (using provider)
    this.coreContract = new ethers.Contract(
      ADDRESSES.JusterCore,
      JusterCoreABI,
      this.provider
    );
    
    this.poolContract = new ethers.Contract(
      ADDRESSES.JusterPool,
      JusterPoolABI,
      this.provider
    );
    
    this.oracleContract = new ethers.Contract(
      ADDRESSES.PriceOracle,
      PriceOracleABI,
      this.provider
    );
    
    // Initialize writable contracts if signer is available
    if (this.signer) {
      this.coreWritable = this.coreContract.connect(this.signer);
      this.poolWritable = this.poolContract.connect(this.signer);
      this.oracleWritable = this.oracleContract.connect(this.signer);
    }
  }
  
  updateSigner(signer) {
    this.signer = signer;
    
    if (signer) {
      this.coreWritable = this.coreContract.connect(signer);
      this.poolWritable = this.poolContract.connect(signer);
      this.oracleWritable = this.oracleContract.connect(signer);
    } else {
      this.coreWritable = null;
      this.poolWritable = null;
      this.oracleWritable = null;
    }
  }
  
  // Core contract methods
  async getEvents() {
    const nextEventId = await this.coreContract.nextEventId();
    const events = [];
    
    for (let i = 0; i < nextEventId; i++) {
      try {
        const event = await this.coreContract.getEvent(i);
        events.push(this.formatEvent(event, i));
      } catch (error) {
        console.error(`Error fetching event ${i}:`, error);
      }
    }
    
    return events;
  }
  
  async getEvent(eventId) {
    const event = await this.coreContract.getEvent(eventId);
    return this.formatEvent(event, eventId);
  }
  
  async getPosition(address, eventId) {
    const position = await this.coreContract.getPosition(address, eventId);
    return this.formatPosition(position);
  }
  
  // Format data from blockchain to frontend format
  formatEvent(event, id) {
    return {
      id,
      currencyPair: this.bytes32ToString(event.currencyPair),
      createdTime: new Date(event.createdTime.toNumber() * 1000),
      targetDynamics: event.targetDynamics.toNumber() / 10000, // Format percentage
      betsCloseTime: new Date(event.betsCloseTime.toNumber() * 1000),
      measurePeriod: event.measurePeriod.toNumber(),
      measureStartTime: event.measureOracleStartTime.toNumber() > 0 
        ? new Date(event.measureOracleStartTime.toNumber() * 1000)
        : null,
      startRate: event.startRate,
      isClosed: event.isClosed,
      closedTime: event.closedOracleTime.toNumber() > 0
        ? new Date(event.closedOracleTime.toNumber() * 1000)
        : null,
      closedRate: event.closedRate,
      closedDynamics: event.closedDynamics,
      isAboveWin: event.isBetsAboveEqWin,
      poolAboveEq: ethers.utils.formatEther(event.poolAboveEq),
      poolBelow: ethers.utils.formatEther(event.poolBelow),
      totalPool: ethers.utils.formatEther(
        event.poolAboveEq.add(event.poolBelow)
      ),
      liquidityPercent: event.liquidityPercent.toNumber(),
      isForceMajeure: event.isForceMajeure,
      status: this.getEventStatus(event)
    };
  }
  
  formatPosition(position) {
    return {
      providedLiquidityAboveEq: ethers.utils.formatEther(position.providedLiquidityAboveEq),
      providedLiquidityBelow: ethers.utils.formatEther(position.providedLiquidityBelow),
      betsAboveEq: ethers.utils.formatEther(position.betsAboveEq),
      betsBelow: ethers.utils.formatEther(position.betsBelow),
      liquidityShares: position.liquidityShares.toString(),
      depositedLiquidity: ethers.utils.formatEther(position.depositedLiquidity),
      depositedBets: ethers.utils.formatEther(position.depositedBets),
      isWithdrawn: position.isWithdrawn,
      totalDeposited: ethers.utils.formatEther(
        position.depositedLiquidity.add(position.depositedBets)
      )
    };
  }
  
  // Transaction methods (require signer)
  async createEvent(params) {
    if (!this.coreWritable) throw new Error("Signer not connected");
    
    const { 
      currencyPair, 
      targetDynamics, 
      betsCloseTime, 
      measurePeriod, 
      liquidityPercent 
    } = params;
    
    // Get creation fees
    const config = await this.coreContract.config();
    const fee = config.measureStartFee.add(config.expirationFee);
    
    // Convert currencyPair to bytes32
    const pairBytes = this.stringToBytes32(currencyPair);
    
    // Convert timestamp to seconds
    const closeTime = Math.floor(new Date(betsCloseTime).getTime() / 1000);
    
    // Convert target dynamics to contract format (multiplied by 10000)
    const targetDynamicsValue = Math.floor(targetDynamics * 10000);
    
    const tx = await this.coreWritable.createEvent(
      pairBytes,
      targetDynamicsValue,
      closeTime,
      measurePeriod,
      liquidityPercent,
      { value: fee }
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'EventCreated');
    return event.args.eventId.toNumber();
  }
  
  async placeBet(eventId, betType, amount, minWinAmount = 0) {
    if (!this.coreWritable) throw new Error("Signer not connected");
    
    const amountWei = ethers.utils.parseEther(amount.toString());
    const minWinWei = ethers.utils.parseEther(minWinAmount.toString());
    
    const tx = await this.coreWritable.placeBet(
      eventId,
      betType, // 0 = Above, 1 = Below
      minWinWei,
      { value: amountWei }
    );
    
    return await tx.wait();
  }
  
  async provideLiquidity(eventId, amount, expectedRatioAboveEq, expectedRatioBelow, maxSlippage) {
    if (!this.coreWritable) throw new Error("Signer not connected");
    
    const amountWei = ethers.utils.parseEther(amount.toString());
    
    const tx = await this.coreWritable.provideLiquidity(
      eventId,
      expectedRatioAboveEq,
      expectedRatioBelow,
      maxSlippage,
      { value: amountWei }
    );
    
    return await tx.wait();
  }
  
  async startMeasurement(eventId) {
    if (!this.coreWritable) throw new Error("Signer not connected");
    
    const tx = await this.coreWritable.startMeasurement(eventId);
    return await tx.wait();
  }
  
  async closeEvent(eventId) {
    if (!this.coreWritable) throw new Error("Signer not connected");
    
    const tx = await this.coreWritable.closeEvent(eventId);
    return await tx.wait();
  }
  
  async withdraw(eventId) {
    if (!this.coreWritable) throw new Error("Signer not connected");
    
    const tx = await this.coreWritable.withdraw(eventId);
    return await tx.wait();
  }
  
  // Pool contract methods
  async getPoolStats() {
    const totalLiquidity = await this.poolContract.getTotalLiquidity();
    const availableLiquidity = await this.poolContract.getAvailableLiquidity();
    const investedLiquidity = await this.poolContract.getInvestedLiquidity();
    const metrics = await this.poolContract.getMetrics();
    const activeEvents = await this.poolContract.getActiveEvents();
    
    return {
      totalLiquidity: ethers.utils.formatEther(totalLiquidity),
      availableLiquidity: ethers.utils.formatEther(availableLiquidity),
      investedLiquidity: ethers.utils.formatEther(investedLiquidity),
      totalDeposits: ethers.utils.formatEther(metrics.totalDeposits),
      totalWithdrawals: ethers.utils.formatEther(metrics.totalWithdrawals),
      totalProfits: ethers.utils.formatEther(metrics.totalProfits),
      totalLosses: ethers.utils.formatEther(metrics.totalLosses),
      totalEvents: metrics.totalEvents.toNumber(),
      activeEvents: activeEvents.length
    };
  }
  
  async getPoolBalance(address) {
    const balance = await this.poolContract.balanceOf(address);
    return ethers.utils.formatEther(balance);
  }
  
  async depositToPool(amount) {
    if (!this.poolWritable) throw new Error("Signer not connected");
    
    const amountWei = ethers.utils.parseEther(amount.toString());
    const tx = await this.poolWritable.deposit({ value: amountWei });
    return await tx.wait();
  }
  
  async withdrawFromPool(amount) {
    if (!this.poolWritable) throw new Error("Signer not connected");
    
    const amountWei = ethers.utils.parseEther(amount.toString());
    const tx = await this.poolWritable.withdraw(amountWei);
    return await tx.wait();
  }
  
  // Helper methods
  getEventStatus(event) {
    if (event.isForceMajeure) {
      return 'Force Majeure';
    }
    
    if (event.isClosed) {
      return 'Closed';
    }
    
    if (event.measureOracleStartTime.toNumber() > 0) {
      return 'Measurement';
    }
    
    const now = Math.floor(Date.now() / 1000);
    if (now >= event.betsCloseTime.toNumber()) {
      return 'Ready for Measurement';
    }
    
    return 'Active';
  }
  
  bytes32ToString(bytes32) {
    // Remove '0x' prefix and trailing zeros
    const hex = bytes32.slice(2).replace(/0+$/, '');
    
    // Convert hex to string
    let result = '';
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substr(i, 2), 16);
      if (code !== 0) {
        result += String.fromCharCode(code);
      }
    }
    
    return result;
  }
  
  stringToBytes32(string) {
    // Convert string to bytes32
    const hex = '0x' + Buffer.from(string).toString('hex').padEnd(64, '0');
    return hex;
  }
}

// Singleton instance for convenience
let contractServiceInstance = null;

export const getContractService = (provider, signer = null) => {
  if (!contractServiceInstance) {
    contractServiceInstance = new ContractService(provider, signer);
  } else if (provider) {
    contractServiceInstance.provider = provider;
    if (signer !== undefined) {
      contractServiceInstance.updateSigner(signer);
    }
  }
  
  return contractServiceInstance;
};
