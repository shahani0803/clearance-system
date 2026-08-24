const Block = require('../blockchain/block');
const BlockchainRecord = require('../models/blockchainRecord');
const generateSHA256 = require('./sha256');

/**
 * Validates the entire blockchain integrity
 * @returns {Object} { isValid, totalBlocks, invalidBlocks, details }
 */
async function validateBlockchainIntegrity() {
  try {
    const clearanceChain = await BlockchainRecord.find({ type: 'clearance' }).sort({ _id: 1 });
    const fineChain = await BlockchainRecord.find({ type: 'fine' }).sort({ _id: 1 });

    if (clearanceChain.length === 0 && fineChain.length === 0) {
      return {
        isValid: true,
        totalBlocks: 0,
        invalidBlocks: [],
        details: "Empty blockchain (Genesis block not created yet)"
      };
    }

    const invalidBlocks = [];

    // 1. Validate clearance chain
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
        invalidBlocks.push({
          blockNumber: i,
          blockId: currentBlock._id,
          type: 'clearance',
          issue: "Hash mismatch - Clearance block has been tampered with",
          expectedHash: tempBlock.calculateHash(),
          storedHash: currentBlock.currentHash
        });
      }

      if (currentBlock.previousHash !== previousBlock.currentHash) {
        invalidBlocks.push({
          blockNumber: i,
          blockId: currentBlock._id,
          type: 'clearance',
          issue: "Chain broken - previousHash doesn't match previous clearance block's currentHash",
          expectedPreviousHash: previousBlock.currentHash,
          storedPreviousHash: currentBlock.previousHash
        });
      }
    }

    // 2. Validate fine chain
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
        invalidBlocks.push({
          blockNumber: i,
          blockId: currentBlock._id,
          type: 'fine',
          issue: "Hash mismatch - Fine block has been tampered with",
          expectedHash: tempBlock.calculateHash(),
          storedHash: currentBlock.currentHash
        });
      }

      if (currentBlock.previousHash !== previousBlock.currentHash) {
        invalidBlocks.push({
          blockNumber: i,
          blockId: currentBlock._id,
          type: 'fine',
          issue: "Chain broken - previousHash doesn't match previous fine block's currentHash",
          expectedPreviousHash: previousBlock.currentHash,
          storedPreviousHash: currentBlock.previousHash
        });
      }
    }

    const totalBlocks = clearanceChain.length + fineChain.length;

    return {
      isValid: invalidBlocks.length === 0,
      totalBlocks: totalBlocks,
      invalidBlocks: invalidBlocks,
      details: invalidBlocks.length === 0
        ? `✅ All ${totalBlocks} blocks (clearance & fines) are valid and properly linked`
        : `⛔ Found ${invalidBlocks.length} issues in the blockchain`
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
}

/**
 * Validates a specific block
 * @param {String} blockId - MongoDB ObjectId of the block
 * @returns {Object} { isValid, block, issues }
 */
async function validateBlock(blockId) {
  try {
    const block = await BlockchainRecord.findById(blockId);

    if (!block) {
      return {
        isValid: false,
        error: "Block not found"
      };
    }

    const issues = [];

    // Recalculate the hash
    const tempBlock = new Block(
      block.timestamp,
      block.studentId,
      block.status,
      block.previousHash
    );

    if (block.currentHash !== tempBlock.calculateHash()) {
      issues.push({
        type: "HASH_MISMATCH",
        message: "Block hash doesn't match calculated hash - Data has been tampered",
        expectedHash: tempBlock.calculateHash(),
        storedHash: block.currentHash
      });
    }

    // Check if previous block exists and is linked
    if (block.previousHash !== "0") {
      const previousBlock = await BlockchainRecord.findOne({ currentHash: block.previousHash });
      if (!previousBlock) {
        issues.push({
          type: "ORPHANED_BLOCK",
          message: "Previous block not found in chain - Block is orphaned",
          expectedPreviousHash: block.previousHash
        });
      }
    }

    return {
      isValid: issues.length === 0,
      block: {
        _id: block._id,
        studentId: block.studentId,
        status: block.status,
        timestamp: block.timestamp,
        previousHash: block.previousHash.substring(0, 16) + "...",
        currentHash: block.currentHash.substring(0, 16) + "..."
      },
      issues: issues
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
}

/**
 * Gets blockchain statistics
 * @returns {Object} { totalBlocks, genesisBlock, latestBlock, studentBlocks, hashHistory }
 */
async function getBlockchainStats() {
  try {
    const chain = await BlockchainRecord.find().sort({ _id: 1 });
    const studentBlocks = await BlockchainRecord.find({ studentId: { $ne: "00000" } });

    if (chain.length === 0) {
      return {
        totalBlocks: 0,
        genesisBlock: null,
        latestBlock: null,
        studentBlocks: 0,
        isBlockchainInitialized: false
      };
    }

    const genesisBlock = chain[0];
    const latestBlock = chain[chain.length - 1];

    // Count unique students
    const uniqueStudents = new Set(studentBlocks.map(b => b.studentId));

    return {
      totalBlocks: chain.length,
      genesisBlock: {
        studentId: genesisBlock.studentId,
        timestamp: genesisBlock.timestamp,
        hash: genesisBlock.currentHash.substring(0, 16) + "..."
      },
      latestBlock: {
        studentId: latestBlock.studentId,
        timestamp: latestBlock.timestamp,
        hash: latestBlock.currentHash.substring(0, 16) + "..."
      },
      totalStudentBlocks: studentBlocks.length,
      uniqueStudents: uniqueStudents.size,
      isBlockchainInitialized: true
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

/**
 * Generates a sample blockchain for testing
 * Creates 5 blocks with different students
 */
async function generateSampleBlockchain() {
  try {
    // Clear existing blockchain (for testing only!)
    await BlockchainRecord.deleteMany({});

    // Create genesis block
    const genesisBlock = new Block(
      new Date(2026, 4, 18, 8, 0, 0).toISOString(),
      "00000",
      "GENESIS_BLOCK",
      "0"
    );
    const genesisRecord = new BlockchainRecord(genesisBlock);
    await genesisRecord.save();

    console.log("✅ Genesis block created");

    // Sample student data
    const sampleData = [
      { studentId: "2025-001", status: JSON.stringify({ department: true, library: true }) },
      { studentId: "2025-002", status: JSON.stringify({ department: false, library: true }) },
      { studentId: "2025-003", status: JSON.stringify({ department: true, library: false }) },
      { studentId: "2025-004", status: "PENDING" },
      { studentId: "2025-005", status: JSON.stringify({ department: true, library: true, hostels: true }) }
    ];

    let previousBlock = genesisRecord;

    // Add sample blocks
    for (let i = 0; i < sampleData.length; i++) {
      const data = sampleData[i];
      const newBlock = new Block(
        new Date(2026, 4, 18, 10 + i, 30, 0).toISOString(),
        data.studentId,
        data.status,
        previousBlock.currentHash
      );

      const newRecord = new BlockchainRecord(newBlock);
      await newRecord.save();
      previousBlock = newRecord;

      console.log(`✅ Block created for ${data.studentId}`);
    }

    return {
      success: true,
      message: "Sample blockchain created with 6 blocks (1 genesis + 5 student blocks)",
      blocks: 6
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Detects tampering in the blockchain
 * @returns {Object} { hasTampering, details }
 */
async function detectTampering() {
  try {
    const result = await validateBlockchainIntegrity();

    if (!result.isValid && result.invalidBlocks.length > 0) {
      return {
        hasTampering: true,
        severity: "CRITICAL",
        blocksAffected: result.invalidBlocks.length,
        affectedBlocks: result.invalidBlocks,
        recommendation: "⚠️ Restore from backup immediately!"
      };
    }

    return {
      hasTampering: false,
      severity: "SAFE",
      message: "✅ No tampering detected - Blockchain is secure"
    };
  } catch (error) {
    return {
      hasTampering: null,
      error: error.message
    };
  }
}

/**
 * Gets the hash chain (sequence of hashes)
 * Useful for visualization
 */
async function getHashChain() {
  try {
    const chain = await BlockchainRecord.find()
      .sort({ _id: 1 })
      .select('studentId currentHash previousHash');

    return chain.map((block, index) => ({
      blockNumber: index,
      studentId: block.studentId,
      currentHash: block.currentHash.substring(0, 16) + "...",
      previousHash: block.previousHash.substring(0, 16) + "...",
      fullCurrentHash: block.currentHash,
      fullPreviousHash: block.previousHash
    }));
  } catch (error) {
    return {
      error: error.message
    };
  }
}

/**
 * Gets all blocks for a specific student
 */
async function getStudentBlockHistory(studentId) {
  try {
    const blocks = await BlockchainRecord.find({ studentId })
      .sort({ _id: 1 });

    return {
      studentId,
      totalRecords: blocks.length,
      blocks: blocks.map(block => ({
        timestamp: block.timestamp,
        status: block.status,
        hash: block.currentHash.substring(0, 16) + "..."
      }))
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

module.exports = {
  validateBlockchainIntegrity,
  validateBlock,
  getBlockchainStats,
  generateSampleBlockchain,
  detectTampering,
  getHashChain,
  getStudentBlockHistory
};
