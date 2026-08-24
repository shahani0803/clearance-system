const Block = require('./block');
const BlockchainRecord = require('../models/blockchainRecord');

class Blockchain {
    constructor() {
        // We rely on MongoDB for persistence, so no in-memory array is kept
    }

    // Retrieve the latest block from MongoDB by type
    async getLatestBlock(type = 'clearance') {
        // Get the most recently inserted block of this type
        const lastBlockRecord = await BlockchainRecord.findOne({ type }).sort({ _id: -1 });
        if (!lastBlockRecord) {
            // If the database is empty for this type, create and return the Genesis Block
            return this.createGenesisBlock(type);
        }
        return lastBlockRecord;
    }

    // Creates the first block if the blockchain is completely empty for a type
    async createGenesisBlock(type = 'clearance') {
        let genesisBlock;
        if (type === 'fine') {
            genesisBlock = new Block(new Date().toISOString(), "00000", "GENESIS_FINE_BLOCK", "0", "fine", "Genesis Fine", 0);
        } else {
            genesisBlock = new Block(new Date().toISOString(), "00000", "GENESIS_BLOCK", "0");
        }
        const genesisRecord = new BlockchainRecord({
            timestamp: genesisBlock.timestamp,
            studentId: genesisBlock.studentId,
            status: genesisBlock.status,
            previousHash: genesisBlock.previousHash,
            currentHash: genesisBlock.currentHash,
            type: genesisBlock.type,
            event: genesisBlock.event,
            amount: genesisBlock.amount
        });
        await genesisRecord.save();
        return genesisRecord;
    }

    // Add a new block to the database
    async addBlock(newBlock) {
        const type = newBlock.type || 'clearance';
        // 1. Get the latest block's hash of the same type to link the chain
        const latestBlock = await this.getLatestBlock(type);
        
        // 2. Point new block to the previous hash
        newBlock.previousHash = latestBlock.currentHash;
        
        // 3. Recalculate hash since previousHash was updated
        newBlock.currentHash = newBlock.calculateHash();
        
        // 4. Save the block to MongoDB
        const blockRecord = new BlockchainRecord({
            timestamp: newBlock.timestamp,
            studentId: newBlock.studentId,
            status: newBlock.status,
            previousHash: newBlock.previousHash,
            currentHash: newBlock.currentHash,
            type: newBlock.type,
            event: newBlock.event,
            amount: newBlock.amount,
            fineId: newBlock.fineId
        });
        await blockRecord.save();
        
        return blockRecord;
    }

    // Utility: Validate the integrity of the chain
    async isChainValid() {
        // 1. Validate clearance chain
        const clearanceChain = await BlockchainRecord.find({ type: 'clearance' }).sort({ _id: 1 });
        for (let i = 1; i < clearanceChain.length; i++) {
            const currentBlock = clearanceChain[i];
            const previousBlock = clearanceChain[i - 1];
            const tempBlock = new Block(
                currentBlock.timestamp,
                currentBlock.studentId,
                currentBlock.status,
                currentBlock.previousHash,
                currentBlock.type,
                currentBlock.event || '',
                currentBlock.amount || 0
            );

            if (currentBlock.currentHash !== tempBlock.calculateHash()) {
                console.error(`Tampering detected at clearance block ${currentBlock._id}`);
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.currentHash) {
                console.error(`Broken link detected at clearance block ${currentBlock._id}`);
                return false;
            }
        }

        // 2. Validate fine chain
        const fineChain = await BlockchainRecord.find({ type: 'fine' }).sort({ _id: 1 });
        for (let i = 1; i < fineChain.length; i++) {
            const currentBlock = fineChain[i];
            const previousBlock = fineChain[i - 1];
            const tempBlock = new Block(
                currentBlock.timestamp,
                currentBlock.studentId,
                currentBlock.status,
                currentBlock.previousHash,
                currentBlock.type,
                currentBlock.event || '',
                currentBlock.amount || 0
            );

            if (currentBlock.currentHash !== tempBlock.calculateHash()) {
                console.error(`Tampering detected at fine block ${currentBlock._id}`);
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.currentHash) {
                console.error(`Broken link detected at fine block ${currentBlock._id}`);
                return false;
            }
        }
        return true;
    }
}

module.exports = new Blockchain();
