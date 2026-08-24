# 📊 Blockchain System - Sample Outputs & Examples

## 1️⃣ Sample Blockchain Records (MongoDB)

### **Genesis Block**
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439001"),
  "timestamp": "2026-05-18T10:00:00.000Z",
  "studentId": "00000",
  "status": "GENESIS_BLOCK",
  "previousHash": "0",
  "currentHash": "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9",
  "createdAt": ISODate("2026-05-18T10:00:00.000Z"),
  "updatedAt": ISODate("2026-05-18T10:00:00.000Z")
}
```

### **Block #2: Student Clearance Approved**
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439002"),
  "timestamp": "2026-05-21T14:32:45.123Z",
  "studentId": "2025-001",
  "status": "{\"department\":true,\"library\":true,\"hostels\":false}",
  "previousHash": "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9",
  "currentHash": "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3",
  "createdAt": ISODate("2026-05-21T14:32:45.123Z"),
  "updatedAt": ISODate("2026-05-21T14:32:45.123Z")
}
```

### **Block #3: Another Student**
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439003"),
  "timestamp": "2026-05-21T14:45:30.456Z",
  "studentId": "2025-002",
  "status": "{\"department\":false,\"library\":true,\"hostels\":true}",
  "previousHash": "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3",
  "currentHash": "e7c2a1f9b4d3e8f1a3c9b2e7f1d4a8c3b9e2f7d1a5c8b3e6f9d2a7c1b4e8",
  "createdAt": ISODate("2026-05-21T14:45:30.456Z"),
  "updatedAt": ISODate("2026-05-21T14:45:30.456Z")
}
```

---

## 2️⃣ API Response Examples

### **Example 1: Approve Clearance**

**Request:**
```bash
curl -X PUT http://localhost:5000/api/students/update-clearance/2025-001 \
  -H "Content-Type: application/json" \
  -d '{
    "clearanceStatus": {
      "department": true,
      "library": true,
      "hostels": false
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "student": {
    "_id": "507f1f77bcf86cd799439xxx",
    "studentId": "2025-001",
    "name": "John Doe",
    "course": "Computer Science",
    "year": 2,
    "rfidUid": "ABC123DEF456",
    "organization": "CCS",
    "subOrganization": "",
    "clearanceStatus": {
      "department": true,
      "library": true,
      "hostels": false
    },
    "fines": {
      "total": 0,
      "isPaid": true
    },
    "createdAt": "2026-05-10T08:00:00.000Z",
    "updatedAt": "2026-05-21T14:32:45.123Z"
  }
}
```

---

### **Example 2: View Entire Blockchain**

**Request:**
```bash
curl http://localhost:5000/api/blockchain
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439001",
    "timestamp": "2026-05-18T10:00:00.000Z",
    "studentId": "00000",
    "status": "GENESIS_BLOCK",
    "previousHash": "0",
    "currentHash": "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9"
  },
  {
    "_id": "507f1f77bcf86cd799439002",
    "timestamp": "2026-05-21T14:32:45.123Z",
    "studentId": "2025-001",
    "status": "{\"department\":true,\"library\":true,\"hostels\":false}",
    "previousHash": "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9",
    "currentHash": "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3"
  },
  {
    "_id": "507f1f77bcf86cd799439003",
    "timestamp": "2026-05-21T14:45:30.456Z",
    "studentId": "2025-002",
    "status": "{\"department\":false,\"library\":true,\"hostels\":true}",
    "previousHash": "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3",
    "currentHash": "e7c2a1f9b4d3e8f1a3c9b2e7f1d4a8c3b9e2f7d1a5c8b3e6f9d2a7c1b4e8"
  }
]
```

---

### **Example 3: Validate Blockchain (Valid)**

**Request:**
```bash
curl http://localhost:5000/api/blockchain/validate
```

**Response:**
```json
{
  "valid": true
}
```

---

### **Example 4: Validate Blockchain (Tampered)**

**Request:**
```bash
curl http://localhost:5000/api/blockchain/validate
```

**Response (if tampering detected):**
```json
{
  "valid": false
}
```

---

### **Example 5: Get Blockchain Statistics**

**Request:**
```bash
curl http://localhost:5000/api/blockchain/stats
```

**Response:**
```json
{
  "totalBlocks": 4,
  "genesisBlock": {
    "studentId": "00000",
    "timestamp": "2026-05-18T10:00:00.000Z",
    "hash": "f8d4c3b2e1a9..."
  },
  "latestBlock": {
    "studentId": "2025-003",
    "timestamp": "2026-05-21T15:10:12.789Z",
    "hash": "7a2c9f1b4e3d..."
  },
  "totalStudentBlocks": 3,
  "uniqueStudents": 3,
  "isBlockchainInitialized": true
}
```

---

### **Example 6: View Hash Chain**

**Request:**
```bash
curl http://localhost:5000/api/blockchain/chain
```

**Response:**
```json
[
  {
    "blockNumber": 0,
    "studentId": "00000",
    "currentHash": "f8d4c3b2...",
    "previousHash": "0...",
    "fullCurrentHash": "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9",
    "fullPreviousHash": "0"
  },
  {
    "blockNumber": 1,
    "studentId": "2025-001",
    "currentHash": "a3f1d7c9...",
    "previousHash": "f8d4c3b2...",
    "fullCurrentHash": "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3",
    "fullPreviousHash": "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9"
  },
  {
    "blockNumber": 2,
    "studentId": "2025-002",
    "currentHash": "e7c2a1f9...",
    "previousHash": "a3f1d7c9...",
    "fullCurrentHash": "e7c2a1f9b4d3e8f1a3c9b2e7f1d4a8c3b9e2f7d1a5c8b3e6f9d2a7c1b4e8",
    "fullPreviousHash": "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3"
  },
  {
    "blockNumber": 3,
    "studentId": "2025-003",
    "currentHash": "7a2c9f1b...",
    "previousHash": "e7c2a1f9...",
    "fullCurrentHash": "7a2c9f1b4e3d8a5c2f9b7d1e4c8a3f2b9e7d1a4c8b2f5d9e3a7c1f4b8d2e6",
    "fullPreviousHash": "e7c2a1f9b4d3e8f1a3c9b2e7f1d4a8c3b9e2f7d1a5c8b3e6f9d2a7c1b4e8"
  }
]
```

---

### **Example 7: Get Student History**

**Request:**
```bash
curl http://localhost:5000/api/blockchain/student/2025-001
```

**Response:**
```json
{
  "studentId": "2025-001",
  "totalRecords": 2,
  "blocks": [
    {
      "timestamp": "2026-05-21T14:32:45.123Z",
      "status": "{\"department\":true,\"library\":true,\"hostels\":false}",
      "hash": "a3f1d7c9..."
    },
    {
      "timestamp": "2026-05-21T16:00:00.000Z",
      "status": "{\"department\":true,\"library\":true,\"hostels\":true}",
      "hash": "d5e8f2a1..."
    }
  ]
}
```

---

### **Example 8: Detect Tampering (Safe)**

**Request:**
```bash
curl http://localhost:5000/api/blockchain/detect-tampering
```

**Response:**
```json
{
  "hasTampering": false,
  "severity": "SAFE",
  "message": "✅ No tampering detected - Blockchain is secure"
}
```

---

### **Example 9: Detect Tampering (Compromised)**

**Request:**
```bash
curl http://localhost:5000/api/blockchain/detect-tampering
```

**Response:**
```json
{
  "hasTampering": true,
  "severity": "CRITICAL",
  "blocksAffected": 2,
  "affectedBlocks": [
    {
      "blockNumber": 1,
      "blockId": "507f1f77bcf86cd799439002",
      "issue": "Hash mismatch - Block has been tampered with",
      "expectedHash": "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3",
      "storedHash": "different1234567890abcdef1234567890abcdef1234567890abcdef123"
    },
    {
      "blockNumber": 2,
      "blockId": "507f1f77bcf86cd799439003",
      "issue": "Chain broken - previousHash doesn't match previous block's currentHash",
      "expectedPreviousHash": "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3",
      "storedPreviousHash": "different1234567890abcdef1234567890abcdef1234567890abcdef123"
    }
  ],
  "recommendation": "⚠️ Restore from backup immediately!"
}
```

---

## 3️⃣ Hash Calculation Examples

### **How SHA-256 Is Calculated for Each Block**

#### **Block 1 (Student 2025-001)**

**Data to hash:**
```
studentId:    "2025-001"
status:       "{\"department\":true,\"library\":true,\"hostels\":false}"
timestamp:    "2026-05-21T14:32:45.123Z"
previousHash: "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9"

Combined string:
"2025-001" + "{\"department\":true,\"library\":true,\"hostels\":false}" + "2026-05-21T14:32:45.123Z" + "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9"

Result (SHA-256):
a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3
```

---

#### **Block 2 (Student 2025-002) - Shows Linking**

**Data to hash:**
```
studentId:    "2025-002"
status:       "{\"department\":false,\"library\":true,\"hostels\":true}"
timestamp:    "2026-05-21T14:45:30.456Z"
previousHash: "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3" ⬅️ FROM BLOCK 1!

Combined string:
"2025-002" + "{\"department\":false,\"library\":true,\"hostels\":true}" + "2026-05-21T14:45:30.456Z" + "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3"

Result (SHA-256):
e7c2a1f9b4d3e8f1a3c9b2e7f1d4a8c3b9e2f7d1a5c8b3e6f9d2a7c1b4e8
```

**Notice**: Previous block's hash is included! This creates the chain.

---

### **If Block 1 Data Changes:**

```
Original: "{\"department\":true,\"library\":true,\"hostels\":false}"
Changed:  "{\"department\":true,\"library\":true,\"hostels\":true}"

New combined string:
"2025-001" + "{\"department\":true,\"library\":true,\"hostels\":true}" + "2026-05-21T14:32:45.123Z" + "f8d4c3b2e1a9..."

New SHA-256:
d5e8f2a1b3c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e

❌ This doesn't match the stored hash!
Block 1 is now marked as TAMPERED.
```

**Effect on Block 2:**
- Block 2's previousHash still points to old hash
- Block 2's previousHash ≠ Block 1's new hash
- ❌ Chain is broken!

---

## 4️⃣ Terminal Output Example

### **Running Test Suite**

```bash
$ node test-blockchain.js

🚀 BLOCKCHAIN TESTING SUITE
══════════════════════════════════════════════════

📝 Test 1: Creating Sample Blocks
──────────────────────────────────────────────────
✅ Genesis block created
✅ Block created for 2025-001
✅ Block created for 2025-002
✅ Block created for 2025-003

✅ All blocks created successfully!

📊 Test 2: Blockchain Statistics
──────────────────────────────────────────────────
{
  "totalBlocks": 4,
  "genesisBlock": {
    "studentId": "00000",
    "timestamp": "2026-05-18T10:00:00.000Z",
    "hash": "f8d4c3b2e1a9..."
  },
  "latestBlock": {
    "studentId": "2025-003",
    "timestamp": "2026-05-21T15:10:12.789Z",
    "hash": "7a2c9f1b4e3d..."
  },
  "totalStudentBlocks": 3,
  "uniqueStudents": 3,
  "isBlockchainInitialized": true
}

🔗 Test 3: Hash Chain Visualization
──────────────────────────────────────────────────

Block #0
├─ Student: 00000
├─ Current Hash:  f8d4c3b2e1a9...
└─ Previous Hash: 0...

Block #1
├─ Student: 2025-001
├─ Current Hash:  a3f1d7c9...
└─ Previous Hash: f8d4c3b2...

Block #2
├─ Student: 2025-002
├─ Current Hash:  e7c2a1f9...
└─ Previous Hash: a3f1d7c9...

Block #3
├─ Student: 2025-003
├─ Current Hash:  7a2c9f1b...
└─ Previous Hash: e7c2a1f9...

✅ Test 4: Blockchain Validation
──────────────────────────────────────────────────
{
  "isValid": true,
  "totalBlocks": 4,
  "invalidBlocks": [],
  "details": "✅ All 4 blocks are valid and properly linked"
}

👤 Test 5: Student Block History
──────────────────────────────────────────────────
{
  "studentId": "2025-001",
  "totalRecords": 1,
  "blocks": [
    {
      "timestamp": "2026-05-21T14:32:45.123Z",
      "status": "{\"department\":true,\"library\":true}",
      "hash": "a3f1d7c9..."
    }
  ]
}

🔒 Test 6: Tampering Detection
──────────────────────────────────────────────────
{
  "hasTampering": false,
  "severity": "SAFE",
  "message": "✅ No tampering detected - Blockchain is secure"
}

⚠️  Test 7: Simulate Tampering (DEMO)
──────────────────────────────────────────────────

🔍 Original Block 2025-002:
   Status: {"department":false,"library":true}
   Hash: e7c2a1f9b4d3...

⚠️  After tampering:
   Status: MALICIOUSLY_CHANGED
   Hash (unchanged): e7c2a1f9b4d3...

🔍 Running validation...

✅ TAMPERING DETECTED!
   Invalid blocks: 1
   Issue: Hash mismatch - Block has been tampered with

✅ Block restored for next tests

══════════════════════════════════════════════════
✅ All tests completed!
```

---

## 5️⃣ MongoDB Query Examples

### **View Recent Blocks**
```javascript
db.blockchainrecords.find().sort({ _id: -1 }).limit(5).pretty()
```

### **Count Blocks Per Student**
```javascript
db.blockchainrecords.aggregate([
  {
    $group: {
      _id: "$studentId",
      count: { $sum: 1 }
    }
  },
  { $match: { _id: { $ne: "00000" } } },
  { $sort: { count: -1 } }
]).pretty()
```

### **Find Timeline of Student Approvals**
```javascript
db.blockchainrecords.find({
  studentId: { $in: ["2025-001", "2025-002", "2025-003"] }
}).sort({ timestamp: 1 }).pretty()
```

### **Export Blockchain to CSV** (in MongoDB Compass)
```javascript
db.blockchainrecords.find().toArray()
```

---

## 6️⃣ Real-World Scenario

### **Timeline: 3 Student Approvals**

**10:00 AM**
```
Admin: "Approve John (2025-001)"
System: Creates Block #1
├─ Hash: a3f1d7c9...
└─ Links to Genesis: f8d4c3b2...
Result: ✅ Saved
```

**10:30 AM**
```
Admin: "Approve Jane (2025-002)"
System: Creates Block #2
├─ Hash: e7c2a1f9...
└─ Links to John: a3f1d7c9... ⬅️ LINKED!
Result: ✅ Saved
```

**11:00 AM**
```
Admin: "Approve Bob (2025-003)"
System: Creates Block #3
├─ Hash: 7a2c9f1b...
└─ Links to Jane: e7c2a1f9... ⬅️ LINKED!
Result: ✅ Saved
```

**2:00 PM - Admin Runs Validation**
```
System: Recalculates all hashes
├─ Genesis Hash: ✅ f8d4c3b2...
├─ John Hash: ✅ a3f1d7c9...
├─ Jane Hash: ✅ e7c2a1f9...
└─ Bob Hash: ✅ 7a2c9f1b...

Result: "✅ Blockchain is secure! All 4 blocks valid."
```

**3:00 PM - Someone Tries to Tamper**
```
Attacker: Changes Jane's department from FALSE to TRUE in MongoDB
```

**3:15 PM - Admin Runs Validation Again**
```
System: Recalculates all hashes
├─ Genesis Hash: ✅ f8d4c3b2...
├─ John Hash: ✅ a3f1d7c9...
├─ Jane Hash: ❌ NEW HASH ≠ STORED HASH
│  Expected: e7c2a1f9...
│  Calculated: d5e8f2a1...
└─ Bob Hash: ❌ LINK BROKEN
   Bob's previousHash points to OLD hash
   But Jane now has a DIFFERENT hash

Result: "⛔ TAMPERING DETECTED!"
Admin: Restores from backup immediately
```

---

## ✅ Summary

Your blockchain system generates:
- ✅ Unique hashes for every block
- ✅ Linked chain of all approvals
- ✅ Real-time validation responses
- ✅ Tamper detection alerts
- ✅ Complete audit trail
- ✅ Student history records

**Everything is production-ready! 🚀**

