import { ethers } from 'ethers'
import { getContractInstance } from '@/contracts'
import { formatEther, parseEther } from 'ethers'

/**
 * JusterService - Service for interacting with Juster contracts
 */
export default class JusterService {
  constructor(provider, signer) {
    this.provider = provider
    this.signer = signer
    
    // Initialize contract instances
    this.coreContract = provider ? getContractInstance('JusterCore', provider) : null
    this.poolContract = provider ? getContractInstance('JusterPool', provider) : null
    this.oracleContract = provider ? getContractInstance('ChainlinkPriceOracle', provider) : null
    
    // Initialize signed contracts if signer is available
    if (signer) {
      this.coreSigned = this.coreContract.connect(signer)
      this.poolSigned = this.poolContract.connect(signer)
      this.oracleSigned = this.oracleContract.connect(signer)
    }
  }

  /**
   * Update provider and signer
   */
  updateProvider(provider, signer) {
    this.provider = provider
    this.signer = signer
    
    // Reinitialize contracts
    this.coreContract = provider ? getContractInstance('JusterCore', provider) : null
    this.poolContract = provider ? getContractInstance('JusterPool', provider) : null
    this.oracleContract = provider ? getContractInstance('ChainlinkPriceOracle', provider) : null
    
    // Reinitialize signed contracts
    if (signer) {
      this.coreSigned = this.coreContract.connect(signer)
      this.poolSigned = this.poolContract.connect(signer)
      this.oracleSigned = this.oracleContract.connect(signer)
    } else {
      this.coreSigned = null
      this.poolSigned = null
      this.oracleSigned = null
    }
  }
  
  /**
   * Get event from contract
   */
  async getEvent(eventId) {
    try {
      if (!this.coreContract) throw new Error('Contract not initialized')
      
      const eventData = await this.coreContract.getEvent(eventId)
      return this._formatEvent(eventData, eventId)
    } catch (error) {
      console.error('Error getting event:', error)
      throw error
    }
  }
  
  /**
   * Get all events
   */
  async getAllEvents() {
    try {
      if (!this.coreContract) throw new Error('Contract not initialized')
      
      const nextEventId = await this.coreContract.nextEventId()
      const events = []
      
      for (let i = 0; i < nextEventId.toNumber(); i++) {
        try {
          const event = await this.getEvent(i)
          events.push(event)
        } catch (error) {
          console.error(`Error fetching event ${i}:`, error)
        }
      }
      
      return events
    } catch (error) {
      console.error('Error getting all events:', error)
      throw error
    }
  }
  
  /**
   * Get position for an address in an event
   */
  async getPosition(address, eventId) {
    try {
      if (!this.coreContract) throw new Error('Contract not initialized')
      
      const position = await this.coreContract.getPosition(address, eventId)
      return this._formatPosition(position)
    } catch (error) {
      console.error('Error getting position:', error)
      throw error
    }
  }
  
  /**
   * Create a new event
   */
  async createEvent(params) {
    try {
      if (!this.coreSigned) throw new Error('Signed contract not initialized')
      
      const { currencyPair, targetDynamics, betsCloseTime, measurePeriod, liquidityPercent } = params
      
      // Get the fee required for creating an event
      const config = await this.coreContract.config()
      const fee = config.measureStartFee.add(config.expirationFee)
      
      // Create transaction
      const tx = await this.coreSigned.createEvent(
        currencyPair,
        targetDynamics,
        betsCloseTime,
        measurePeriod,
        liquidityPercent,
        { value: fee }
      )
      
      // Wait for transaction to be mined
      const receipt = await tx.wait()
      
      // Parse the event from logs
      const eventCreatedEvent = receipt.events.find(event => event.event === 'EventCreated')
      const eventId = eventCreatedEvent.args.eventId.toNumber()
      
      return eventId
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    }
  }
  
  /**
   * Place a bet on an event
   */
  async placeBet(eventId, betType, amount, minimalWinAmount = 0) {
    try {
      if (!this.coreSigned) throw new Error('Signed contract not initialized')
      
      // Convert amount to wei
      const amountInWei = parseEther(amount.toString())
      const minWinInWei = parseEther(minimalWinAmount.toString())
      
      // Send transaction
      const tx = await this.coreSigned.placeBet(
        eventId,
        betType, // 0 for AboveEq, 1 for Below
        minWinInWei,
        { value: amountInWei }
      )
      
      // Wait for transaction to be mined
      const receipt = await tx.wait()
      
      return receipt
    } catch (error) {
      console.error('Error placing bet:', error)
      throw error
    }
  }
  
  /**
   * Provide liquidity to an event
   */
  async provideLiquidity(eventId, amount, expectedRatioAboveEq, expectedRatioBelow, maxSlippage) {
    try {
      if (!this.coreSigned) throw new Error('Signed contract not initialized')
      
      // Convert amount to wei
      const amountInWei = parseEther(amount.toString())
      
      // Send transaction
      const tx = await this.coreSigned.provideLiquidity(
        eventId,
        expectedRatioAboveEq,
        expectedRatioBelow,
        maxSlippage,
        { value: amountInWei }
      )
      
      // Wait for transaction to be mined
      const receipt = await tx.wait()
      
      return receipt
    } catch (error) {
      console.error('Error providing liquidity:', error)
      throw error
    }
  }
  
  /**
   * Withdraw winnings from an event
   */
  async withdraw(eventId) {
    try {
      if (!this.coreSigned) throw new Error('Signed contract not initialized')
      
      // Send transaction
      const tx = await this.coreSigned.withdraw(eventId)
      
      // Wait for transaction to be mined
      const receipt = await tx.wait()
      
      return receipt
    } catch (error) {
      console.error('Error withdrawing:', error)
      throw error
    }
  }
  
  /**
   * Start measurement for an event
   */
  async startMeasurement(eventId) {
    try {
      if (!this.coreSigned) throw new Error('Signed contract not initialized')
      
      // Send transaction
      const tx = await this.coreSigned.startMeasurement(eventId)
      
      // Wait for transaction to be mined
      const receipt = await tx.wait()
      
      return receipt
    } catch (error) {
      console.error('Error starting measurement:', error)
      throw error
    }
  }
  
  /**
   * Close an event
   */
  async closeEvent(eventId) {
    try {
      if (!this.coreSigned) throw new Error('Signed contract not initialized')
      
      // Send transaction
      const tx = await this.coreSigned.closeEvent(eventId)
      
      // Wait for transaction to be mined
      const receipt = await tx.wait()
      
      return receipt
    } catch (error) {
      console.error('Error closing event:', error)
      throw error
    }
  }
  
  /**
   * Format event data from contract
   */
  _formatEvent(eventData, eventId) {
    return {
      id: eventId,
      currencyPair: eventData.currencyPair,
      createdTime: new Date(eventData.createdTime.toNumber() * 1000),
      targetDynamics: eventData.targetDynamics.toNumber(),
      betsCloseTime: new Date(eventData.betsCloseTime.toNumber() * 1000),
      measurePeriod: eventData.measurePeriod.toNumber(),
      measureOracleStartTime: eventData.measureOracleStartTime.toNumber() > 0 
        ? new Date(eventData.measureOracleStartTime.toNumber() * 1000) 
        : null,
      startRate: eventData.startRate.toString(),
      isClosed: eventData.isClosed,
      closedOracleTime: eventData.closedOracleTime.toNumber() > 0 
        ? new Date(eventData.closedOracleTime.toNumber() * 1000) 
        : null,
      closedRate: eventData.closedRate.toString(),
      closedDynamics: eventData.closedDynamics.toNumber(),
      isBetsAboveEqWin: eventData.isBetsAboveEqWin,
      poolAboveEq: formatEther(eventData.poolAboveEq),
      poolBelow: formatEther(eventData.poolBelow),
      totalLiquidityShares: eventData.totalLiquidityShares.toString(),
      liquidityPercent: eventData.liquidityPercent.toNumber(),
      measureStartFee: formatEther(eventData.measureStartFee),
      expirationFee: formatEther(eventData.expirationFee),
      rewardCallFee: formatEther(eventData.rewardCallFee),
      oracleAddress: eventData.oracleAddress,
      maxAllowedMeasureLag: eventData.maxAllowedMeasureLag.toNumber(),
      isForceMajeure: eventData.isForceMajeure,
      creator: eventData.creator,
      // Computed fields
      status: this._getEventStatus(eventData),
      totalPool: formatEther(eventData.poolAboveEq.add(eventData.poolBelow)),
    }
  }
  
  /**
   * Format position data from contract
   */
  _formatPosition(positionData) {
    return {
      providedLiquidityAboveEq: formatEther(positionData.providedLiquidityAboveEq),
      providedLiquidityBelow: formatEther(positionData.providedLiquidityBelow),
      betsAboveEq: formatEther(positionData.betsAboveEq),
      betsBelow: formatEther(positionData.betsBelow),
      liquidityShares: positionData.liquidityShares.toString(),
      depositedLiquidity: formatEther(positionData.depositedLiquidity),
      depositedBets: formatEther(positionData.depositedBets),
      isWithdrawn: positionData.isWithdrawn,
      // Computed fields
      totalDeposited: formatEther(positionData.depositedLiquidity.add(positionData.depositedBets)),
    }
  }
  
  /**
   * Get human-readable status of an event
   */
  _getEventStatus(eventData) {
    if (eventData.isForceMajeure) {
      return 'Force Majeure'
    }
    
    if (eventData.isClosed) {
      return 'Closed'
    }
    
    if (eventData.measureOracleStartTime.toNumber() > 0) {
      return 'Measurement'
    }
    
    const now = Math.floor(Date.now() / 1000)
    if (now >= eventData.betsCloseTime.toNumber()) {
      return 'Ready for Measurement'
    }
    
    return 'Active'
  }
} 
