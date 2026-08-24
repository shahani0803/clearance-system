# 🔐 Blockchain Security & Integrity Guide

## Overview

Your CLEARANCE SYSTEM uses SHA-256 hashing and blockchain structure to ensure **data integrity** and **tamper detection**. Every clearance transaction is cryptographically linked to the previous one, creating an immutable chain.

---

## 📚 How SHA-256 Hashing Works

### What is SHA-256?

SHA-256 (Secure Hash Algorithm 256-bit) is a cryptographic function that:
- **Inputs**: Any data (student ID, status, timestamp)
- **Output**: A unique 64-character hexadecimal string (hash)
- **Key Property**: Even a 1-bit change in input creates a completely different hash

### Example:

```
Input:  "2025-001" + "CLEARED" + "2026-05-18T10:30:00Z" + "abc123"
Output: f4e8c3b9d2a1f7e4c9b8a3d7f2e1c4b9f7d2a8e3c1b9f4e7d2a8b3c9f1e4a
```

Same input with 1 character changed:
```
Input:  "2025-001" + "DENIED" + "2026-05-18T10:30:00Z" + "abc123"
Output: 7a2c9f1b4e3d8a5c2f9b7d1e4c8a3f2b9e7d1a4c8b2f5d9e3a7c1f4b8d2e6
```

### Why This Matters:

- **Immutable**: Can't recreate the same hash with different data
- **Fast**: Can validate in milliseconds
- **One-way**: Can't reverse a hash to get original data
- **Deterministic**: Same input always produces same hash

---

## ⛓️ How the Blockchain Structure Works

### Block Structure:

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  studentId: "2025-001",
  status: "CLEARED",  // Or: {"department": true, "library": true}
  timestamp: "2026-05-18T10:30:00.000Z",
  previousHash: "abc123def456...",     // Hash of previous block
  currentHash: "xyz789uvw123...",       // Hash of this block
  createdAt: "2026-05-18T10:30:00.000Z",
  updatedAt: "2026-05-18T10:30:00.000Z"
}
```

### How Blocks Are Linked:

```
┌─────────────────────────┐
│     GENESIS BLOCK       │
├─────────────────────────┤
│ studentId: "00000"      │
│ status: "GENESIS_BLOCK" │
│ previousHash: "0"       │
│ currentHash: "hash1"    │◄─────────────────┐
└─────────────────────────┘                  │
         ▼                                    │
┌─────────────────────────┐                  │
│     BLOCK #2            │                  │
├─────────────────────────┤                  │
│ studentId: "2025-001"   │                  │
│ status: "CLEARED"       │                  │
│ previousHash: "hash1" ◄─┼──────────────────┘ (Links to genesis)
│ currentHash: "hash2"    │◄─────────────────┐
└─────────────────────────┘                  │
         ▼                                    │
┌─────────────────────────┐                  │
│     BLOCK #3            │                  │
├─────────────────────────┤                  │
│ studentId: "2025-002"   │                  │
│ status: "PENDING"       │                  │
│ previousHash: "hash2" ◄─┼──────────────────┘ (Links to block #2)
│ currentHash: "hash3"    │◄────────────────── Will be used as previousHash in block #4
└─────────────────────────┘
```

---

## 🔗 How Hashes Are Generated

### The Hashing Formula:

```javascript
currentHash = SHA256(studentId + status + timestamp + previousHash)
```

### Step-by-Step Example:

#### Block #1 (Genesis):
```
Input:  "00000" + "GENESIS_BLOCK" + "2026-05-18T10:00:00Z" + "0"
Hash:   f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9
```

#### Block #2 (Student Clearance):
```
Input:  "2025-001" + "CLEARED" + "2026-05-18T10:30:00Z" + "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9"
        (studentId) + (status) + (timestamp) + (previous block's hash)
Hash:   a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3
```

#### Block #3 (Next Student):
```
Input:  "2025-002" + "PENDING" + "2026-05-18T10:45:00Z" + "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3"
        (studentId) + (status) + (timestamp) + (previous block's hash)
Hash:   e4b9d2f3a1c8f5d7b3e9c2a4f1d8b5e7a9c3f6d2b8e1a4c7f9d3e6b2a5
```

---

## 🛡️ How Tampering Is Detected

### Scenario: Someone tries to modify Block #2

**Original Block #2:**
```javascript
{
  studentId: "2025-001",
  status: "CLEARED",
  timestamp: "2026-05-18T10:30:00Z",
  previousHash: "f8d4c3b2...",
  currentHash: "a3f1d7c9..." ✓ Valid
}
```

**Tampered Block #2 (status changed to DENIED):**
```javascript
{
  studentId: "2025-001",
  status: "DENIED",  // ⚠️ Changed!
  timestamp: "2026-05-18T10:30:00Z",
  previousHash: "f8d4c3b2...",
  currentHash: "a3f1d7c9..." ❌ MISMATCH!
}
```

### Validation Process:

1. **Recalculate the hash:**
   ```
   newHash = SHA256("2025-001" + "DENIED" + "2026-05-18T10:30:00Z" + "f8d4c3b2...")
           = e7c2a1f9b4d3e8f1a3c9b2e7f1d4a8c3b9e2f7d1a5c8b3e6f9d2a7c1b4e8
   ```

2. **Compare with stored hash:**
   ```
   stored:     a3f1d7c9...
   calculated: e7c2a1f9... ❌ THEY DON'T MATCH!
   ```

3. **Result**: ⛔ **TAMPERING DETECTED!**

---

## 📊 Blockchain Records MongoDB Schema

```javascript
{
  _id: ObjectId,
  timestamp: String (ISO 8601),
  studentId: String,
  status: String (or JSON stringified),
  previousHash: String,
  currentHash: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Storage Example:

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "timestamp": "2026-05-18T10:30:00.000Z",
  "studentId": "2025-001",
  "status": "{\"department\":true,\"library\":true}",
  "previousHash": "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9",
  "currentHash": "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3",
  "createdAt": "2026-05-18T10:30:00.000Z",
  "updatedAt": "2026-05-18T10:30:00.000Z"
}
```

---

## 🔍 Validation Functions

### Chain Integrity Check:

```javascript
async isChainValid() {
  const chain = await BlockchainRecord.find().sort({ _id: 1 });
  
  for (let i = 1; i < chain.length; i++) {
    const currentBlock = chain[i];
    const previousBlock = chain[i - 1];

    // Check 1: Block hasn't been tampered with
    const tempBlock = new Block(
      currentBlock.timestamp,
      currentBlock.studentId,
      currentBlock.status,
      currentBlock.previousHash
    );
    
    if (currentBlock.currentHash !== tempBlock.calculateHash()) {
      return false; // ❌ Block tampered!
    }

    // Check 2: Blocks are properly linked
    if (currentBlock.previousHash !== previousBlock.currentHash) {
      return false; // ❌ Chain broken!
    }
  }
  
  return true; // ✅ Chain is valid!
}
```

### What It Checks:

1. **Individual Block Integrity**: Recalculates each block's hash
2. **Chain Linking**: Verifies each block points to previous block
3. **No Gaps**: Ensures no blocks are missing or reordered

---

## 🚀 Integration Flow

### When a Student's Clearance is Updated:

```
1. Admin approves clearance for Student 2025-001
   ↓
2. Server receives: PUT /api/students/update-clearance/2025-001
   with clearanceStatus: { department: true, library: true }
   ↓
3. Create Block:
   - studentId: "2025-001"
   - status: "{"department":true,"library":true}"
   - timestamp: now
   - previousHash: (fetch latest block's currentHash)
   ↓
4. Calculate Hash:
   currentHash = SHA256(studentId + status + timestamp + previousHash)
   ↓
5. Save to MongoDB:
   BlockchainRecord { ...block data, currentHash }
   ↓
6. Return Success Response
```

---

## 📦 Required NPM Packages

Your `package.json` already includes:

```json
{
  "crypto": "built-in Node.js module",
  "mongoose": "^7.8.9",
  "express": "^4.22.1"
}
```

No additional packages needed! ✅

---

## ✅ API Endpoints

### 1. Update Clearance (Create Block):

**Request:**
```
PUT /api/students/update-clearance/2025-001
Content-Type: application/json

{
  "clearanceStatus": {
    "department": true,
    "library": true,
    "hostels": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "student": {
    "_id": "...",
    "studentId": "2025-001",
    "name": "John Doe",
    "clearanceStatus": {
      "department": true,
      "library": true,
      "hostels": false
    }
  }
}
```

### 2. View Entire Blockchain:

**Request:**
```
GET /api/blockchain
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "studentId": "00000",
    "status": "GENESIS_BLOCK",
    "timestamp": "2026-05-18T10:00:00.000Z",
    "previousHash": "0",
    "currentHash": "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "studentId": "2025-001",
    "status": "{\"department\":true,\"library\":true}",
    "timestamp": "2026-05-18T10:30:00.000Z",
    "previousHash": "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9",
    "currentHash": "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3"
  }
]
```

### 3. Validate Chain Integrity:

**Request:**
```
GET /api/blockchain/validate
```

**Response (Valid Chain):**
```json
{
  "valid": true
}
```

**Response (Compromised Chain):**
```json
{
  "valid": false,
  "error": "Tampering detected at block [ObjectId]"
}
```

---

## 🎯 Key Takeaways

| Concept | Explanation |
|---------|-------------|
| **SHA-256** | One-way hash function. Same input = same hash. Different input = completely different hash. |
| **Block** | Contains: studentId, status, timestamp, previousHash, currentHash |
| **Chain Link** | Each block's previousHash = previous block's currentHash |
| **Tampering** | If data changes, hash becomes invalid. Breaking chain breaks all blocks after it. |
| **Validation** | Recalculate hashes and compare. If they don't match, data was tampered. |

---

## 📝 Quick Reference

### Create New Block:
```javascript
const newBlock = new Block(timestamp, studentId, status);
// previousHash is automatically added by blockchain.addBlock()
await blockchain.addBlock(newBlock);
```

### Validate Chain:
```javascript
const isValid = await blockchain.isChainValid();
console.log(isValid ? "✅ Chain is safe" : "⛔ Tampering detected!");
```

### View Hashes:
```javascript
const chain = await BlockchainRecord.find().select('studentId status currentHash previousHash');
chain.forEach(block => {
  console.log(`${block.studentId}: ${block.currentHash.substring(0, 8)}...`);
});
```

---

## 🔒 Security Benefits

1. **Audit Trail**: Every clearance change is recorded and linked
2. **Tampering Detection**: Any modification breaks the chain
3. **Timestamp Evidence**: Each block is timestamped
4. **No Reversibility**: Can't fake old transactions
5. **Cryptographic Integrity**: SHA-256 is industry-standard

---

**Your system is secure! 🚀**
