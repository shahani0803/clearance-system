const generateSHA256 = require('../utils/sha256');

class Block {
    constructor(timestamp, studentId, status, previousHash = '', type = 'clearance', event = '', amount = 0) {
        this.timestamp = timestamp;
        this.studentId = studentId;
        // Stringify status (since it might be an object/Map of clearances)
        this.status = typeof status === 'object' ? JSON.stringify(status) : status;
        this.previousHash = previousHash;
        this.type = type;
        this.event = event;
        this.amount = amount;
        this.currentHash = this.calculateHash();
    }

    // Hash logic: studentID + status + timestamp + previousHash (for clearance)
    // Hash logic: studentId + event + amount + status + timestamp + previousHash (for fine)
    calculateHash() {
        if (this.type === 'fine') {
            return generateSHA256(this.studentId + this.event + this.amount + this.status + this.timestamp + this.previousHash);
        }
        return generateSHA256(this.studentId + this.status + this.timestamp + this.previousHash);
    }
}

module.exports = Block;
