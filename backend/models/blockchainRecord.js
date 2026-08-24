const mongoose = require('mongoose');

const blockchainRecordSchema = new mongoose.Schema({
    timestamp: { type: String, required: true },
    studentId: { type: String, required: true },
    status: { type: String, required: true },
    previousHash: { type: String, required: true },
    currentHash: { type: String, required: true },
    type: { type: String, enum: ['clearance', 'fine'], default: 'clearance' },
    event: { type: String },
    amount: { type: Number },
    fineId: { type: String }
}, { timestamps: true });

const BlockchainRecord = mongoose.model('BlockchainRecord', blockchainRecordSchema);

module.exports = BlockchainRecord;
