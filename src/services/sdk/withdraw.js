/**
 * Withdraw winnings from events
 */
import { flameWager } from "./flameWager"

/**
 * Withdraw winnings from a single event
 * @param {number} eventId - The event ID to withdraw from
 * @returns {Promise<ethers.TransactionResponse>}
 */
export const withdraw = async (eventId) => {
    if (!flameWager.core) {
        throw new Error("Contract not initialized. Please connect wallet first.")
    }

    const tx = await flameWager.core.withdraw(eventId)
    return tx
}

/**
 * Withdraw winnings from multiple events
 * Note: The contract currently only supports single withdrawals,
 * so we loop through the IDs.
 * @param {number[]} eventIds - Array of event IDs to withdraw from
 * @returns {Promise<Object>} A pseudo-transaction object that implements .wait()
 */
export const withdrawAll = async (eventIds) => {
    if (!flameWager.core) {
        throw new Error("Contract not initialized. Please connect wallet first.")
    }

    if (!eventIds || eventIds.length === 0) {
        throw new Error("No event IDs provided")
    }

    // Since the contract doesn't support withdrawMultiple, we loop.
    // To maintain compatibility with the UI's .wait() expectation,
    // we'll return an object that waits for all transactions.
    
    const txs = []
    for (const eventId of eventIds) {
        const tx = await flameWager.core.withdraw(eventId)
        txs.push(tx)
    }

    return {
        hash: txs.map(t => t.hash).join(", "),
        wait: async () => {
            const receipts = await Promise.all(txs.map(t => t.wait()))
            return receipts
        }
    }
}
