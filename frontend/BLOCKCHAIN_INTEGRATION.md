# 🔐 Blockchain Verification Page - Integration Guide

## 📋 Step-by-Step Integration

### **Step 1: Add the Component to Routing**

Update your `frontend/src/App.tsx`:

```typescript
// Add import at the top
import BlockchainVerification from './components/BlockchainVerification';

// Update your ViewType in Types.ts to include 'blockchain'
type ViewType = 'dashboard' | 'students' | 'clearance' | 'logs' | 'history' | 'blockchain';

// In your renderView() function, add:
case 'blockchain':
  return <BlockchainVerification />;
```

---

### **Step 2: Add Sidebar Menu Item**

Update `frontend/src/components/Sidebar.tsx`:

```typescript
// Add this to your sidebar navigation
<button
  onClick={() => setActiveTab('blockchain')}
  className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-all ${
    activeTab === 'blockchain'
      ? 'bg-blue-600 text-white shadow-lg'
      : 'text-slate-700 hover:bg-slate-100'
  }`}
>
  <span className="text-lg mr-3">⛓️</span> Blockchain Verification
</button>
```

---

### **Step 3: Ensure Backend Routes Exist**

Your `backend/server.cjs` should already have these endpoints (created earlier):

```javascript
// View entire blockchain
app.get('/api/blockchain', async (req, res) => {
  try {
    const chain = await BlockchainRecord.find().sort({ _id: 1 });
    res.json(chain);
  } catch (err) { res.status(500).send(err.message); }
});

// Validate blockchain integrity
app.get('/api/blockchain/validate', async (req, res) => {
  try {
    const isValid = await blockchain.isChainValid();
    res.json({ valid: isValid });
  } catch (err) { res.status(500).send(err.message); }
});

// Get blockchain statistics
app.get('/api/blockchain/stats', async (req, res) => {
  try {
    const { getBlockchainStats } = require('./utils/blockchainValidator');
    const stats = await getBlockchainStats();
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get hash chain
app.get('/api/blockchain/chain', async (req, res) => {
  try {
    const { getHashChain } = require('./utils/blockchainValidator');
    const chain = await getHashChain();
    res.json(chain);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Detect tampering
app.get('/api/blockchain/detect-tampering', async (req, res) => {
  try {
    const { detectTampering } = require('./utils/blockchainValidator');
    const result = await detectTampering();
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
```

---

### **Step 4: Test the Integration**

1. **Start your backend:**
   ```bash
   cd backend
   npm install
   node server.cjs
   ```

2. **Start your frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Navigate to Blockchain Verification page** from the sidebar

4. **Click "Verify Blockchain"** to check integrity

---

## 📊 Example API Responses

### **GET /api/blockchain** - View Blockchain
```json
[
  {
    "_id": "507f1f77bcf86cd799439001",
    "timestamp": "2026-05-18T10:00:00.000Z",
    "studentId": "00000",
    "status": "GENESIS_BLOCK",
    "previousHash": "0",
    "currentHash": "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9",
    "createdAt": "2026-05-18T10:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439002",
    "timestamp": "2026-05-21T14:32:45.123Z",
    "studentId": "2025-001",
    "status": "{\"department\":true,\"library\":true}",
    "previousHash": "f8d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9f7d4c3b2e1a9",
    "currentHash": "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3",
    "createdAt": "2026-05-21T14:32:45.123Z"
  }
]
```

---

### **GET /api/blockchain/validate** - Check Integrity
```json
{
  "valid": true
}
```

Or if tampered:
```json
{
  "valid": false
}
```

---

### **GET /api/blockchain/stats** - Get Statistics
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

### **GET /api/blockchain/detect-tampering** - Detect Tampering
```json
{
  "hasTampering": false,
  "severity": "SAFE",
  "message": "✅ No tampering detected - Blockchain is secure"
}
```

Or if tampered:
```json
{
  "hasTampering": true,
  "severity": "CRITICAL",
  "blocksAffected": 1,
  "affectedBlocks": [
    {
      "blockNumber": 1,
      "blockId": "507f1f77bcf86cd799439002",
      "issue": "Hash mismatch - Block has been tampered with",
      "expectedHash": "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3",
      "storedHash": "different1234567890abcdef"
    }
  ],
  "recommendation": "⚠️ Restore from backup immediately!"
}
```

---

## 🎨 UI Features

### **1. Status Dashboard**
- Total Blocks count
- Student Records count
- Unique Students count
- Blockchain Status (VALID/INVALID)

### **2. Blockchain Status Banner**
- Shows overall blockchain health
- Displays integrity details
- Lists any tampered blocks with issues

### **3. Action Buttons**
- **Verify Blockchain** - Recalculate all hashes
- **Detect Tampering** - Check for modifications
- **View Hash Chain** - Visualize block links

### **4. Filter Options**
- **All** - Show all blocks
- **Valid** - Show only verified blocks
- **Invalid** - Show only tampered blocks

### **5. Block Details Table**
- Block number
- Student ID
- Clearance status
- Timestamp
- Integrity status (✓ VALID / ✗ INVALID)
- Expandable details

### **6. Expanded Block Details**
- Current Hash (SHA-256)
- Previous Hash (with toggle to show full)
- Clearance Status (JSON format)
- Integrity check results
- Tamper details if invalid

### **7. Hash Chain Visualization**
- Shows first 10 blocks
- Displays hash links with arrows
- Indicates chain structure

### **8. Information Panel**
- How blockchain works
- What to look for
- Security indicators

---

## 🔐 How SHA-256 Hashing Works in Frontend

The frontend displays hashed data that's calculated on the backend:

```
Backend Process:
1. Student approves clearance
2. Server creates Block:
   - studentId: "2025-001"
   - status: "{"department":true,"library":true}"
   - timestamp: "2026-05-21T14:32:45.123Z"
   - previousHash: "f8d4c3b2..."

3. Calculate Hash:
   SHA256("2025-001" + "{"department":true,"library":true}" + "2026-05-21T14:32:45.123Z" + "f8d4c3b2...")
   = "a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3f1d7c9b4e2f8a3"

4. Store in MongoDB blockchainrecords collection

5. Frontend fetches and displays
```

---

## 🔍 How Verification Works

### **Frontend Verification Process:**

1. **Fetch Blockchain Data**
   ```
   GET /api/blockchain → Returns all blocks
   ```

2. **Call Validate Endpoint**
   ```
   GET /api/blockchain/validate → Returns validation result
   ```

3. **Backend Re-calculates All Hashes**
   - For each block, recalculates: `SHA256(studentId + status + timestamp + previousHash)`
   - Compares calculated hash with stored hash
   - If mismatch: Block is TAMPERED
   - Checks if previousHash matches previous block's currentHash
   - If no match: Chain is BROKEN

4. **Display Results in UI**
   - ✓ VALID: All hashes match, chain is linked
   - ✗ INVALID: Hashes don't match or chain is broken

---

## 🛡️ How Tampering Detection Works

### **Scenario: Someone Modifies a Block's Data in MongoDB**

```
Original Block:
{
  studentId: "2025-001",
  status: "{"department":true,"library":true}",
  currentHash: "a3f1d7c9..."
}

Tampered Block:
{
  studentId: "2025-001",
  status: "{"department":true,"library":true,"hostels":true}",  // CHANGED!
  currentHash: "a3f1d7c9..."  // Still old hash!
}
```

**When Verification Runs:**

1. **Recalculate Hash:**
   ```
   New Hash = SHA256("2025-001" + "{"department":true,"library":true,"hostels":true}" + ... )
            = "different_hash_value"
   ```

2. **Compare:**
   ```
   Stored Hash:      "a3f1d7c9..."
   Calculated Hash:  "different_hash_value"
   
   ❌ MISMATCH DETECTED!
   ```

3. **Result:**
   ```
   Block marked as TAMPERED
   Issue: "Hash mismatch - Block has been tampered with"
   ```

4. **Chain Break:**
   - Next block's previousHash still points to old hash
   - ❌ Chain is broken!
   - All following blocks are also invalid

---

## 📝 Example Workflow

### **1. Admin Approves Clearance**
```
Admin clicks "Approve" for Student 2025-001
↓
Backend creates Block with SHA-256 hash
↓
Stored in MongoDB blockchainrecords collection
↓
Socket.io broadcasts "student-updated"
```

### **2. Admin Opens Blockchain Verification Page**
```
Page loads → Fetches /api/blockchain
↓
Shows all blocks in table
↓
Displays timestamps, hashes, student IDs
↓
Shows status: VALID or TAMPERED
```

### **3. Admin Clicks "Verify Blockchain"**
```
Frontend calls: GET /api/blockchain/validate
↓
Backend re-calculates all hashes
↓
Compares with stored hashes
↓
Returns validation result
↓
Frontend displays: ✓ VALID or ✗ INVALID
```

### **4. Admin Clicks "Detect Tampering"**
```
Frontend calls: GET /api/blockchain/detect-tampering
↓
Backend checks each block:
  - Recalculate hash
  - Compare stored hash
  - Check previousHash links
↓
Returns list of tampered blocks (if any)
↓
Shows alert with details
```

### **5. Admin Expands Block Details**
```
Click "Show Details" on any block
↓
Displays:
  - Full SHA-256 hash
  - Previous hash
  - Clearance status (JSON)
  - Integrity check result
  - Tamper details (if any)
```

---

## ✅ Verification Checklist

- [ ] Added `BlockchainVerification.tsx` component
- [ ] Updated `App.tsx` to include 'blockchain' route
- [ ] Added sidebar menu item in `Sidebar.tsx`
- [ ] Verified backend routes are in `server.cjs`
- [ ] Started backend server
- [ ] Started frontend dev server
- [ ] Navigated to Blockchain Verification page
- [ ] Clicked "Verify Blockchain" button
- [ ] Clicked "Detect Tampering" button
- [ ] Expanded block details
- [ ] Checked that hashes display correctly

---

## 🚀 Advanced Features (Optional)

### **1. Export Blockchain to CSV**
```typescript
const exportToCSV = () => {
  const csv = blockchain.map(b => 
    `${b.studentId},${b.status},${b.timestamp},${b.currentHash}`
  ).join('\n');
  
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
  element.setAttribute('download', 'blockchain.csv');
  element.click();
};
```

### **2. Real-Time Monitoring**
```typescript
useEffect(() => {
  const interval = setInterval(fetchBlockchainData, 30000); // Refresh every 30s
  return () => clearInterval(interval);
}, []);
```

### **3. Email Alerts on Tampering**
```typescript
useEffect(() => {
  if (validation?.hasTampering) {
    // Send alert email to admin
    fetch('/api/admin/alert-tampering', {
      method: 'POST',
      body: JSON.stringify({ blocks: validation.invalidBlocks })
    });
  }
}, [validation]);
```

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Failed to fetch blockchain data"** | Check backend is running on localhost:5000 |
| **No blocks displaying** | First approve a clearance to create first block |
| **CORS errors** | Ensure CORS is enabled in backend |
| **Hashes not showing** | Check blockchain records exist in MongoDB |
| **Validation button not working** | Check `/api/blockchain/validate` endpoint exists |

---

## 🎯 Summary

Your Blockchain Verification Page:
- ✅ Displays all blockchain blocks
- ✅ Shows SHA-256 hashes
- ✅ Verifies blockchain integrity
- ✅ Detects tampering instantly
- ✅ Provides detailed block information
- ✅ Visualizes hash chain links
- ✅ Filters by validity status
- ✅ Beautiful, user-friendly UI

**Everything is production-ready! 🚀**

