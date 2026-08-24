const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { Bonjour } = require('bonjour-service');

// 1. IMPORT MODELS & LOGIC
const { Student, AttendanceLog, Event, handleScan } = require('./models/student');
const Block = require('./blockchain/block');
const blockchain = require('./blockchain/blockchain');
const generateSHA256 = require('./utils/sha256');

// 2. INITIALIZE APP & SERVER
const app = express();
const server = http.createServer(app);
const bonjour = new Bonjour();
const PORT = process.env.PORT || 5001;


const settingsSchema = new mongoose.Schema({
  activeEvent: String,
  eventMode: String,
  selectedOrg: String,
  selectedSubOrg: String,
  eventDate: String,
  amInStart: String, amInEnd: String,
  amOutStart: String, amOutEnd: String,
  pmInStart: String, pmInEnd: String,
  pmOutStart: String, pmOutEnd: String,
  mornIn: String, mornOut: String,
  aftIn: String, aftOut: String,
  activeWindow: String,
  fineAMIn: Number, fineAMOut: Number,
  finePMIn: Number, finePMOut: Number,
  isEventSaved: Boolean,
  processedWindows: [String]
});

const Settings = mongoose.model('Settings', settingsSchema);

const parseTimeToMinutes = (time) => {
  if (!time || typeof time !== 'string') return null;
  const parts = time.split(':');
  if (parts.length !== 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const getWindowConfig = (settings) => ({
  AM_IN: {
    key: 'AM_IN',
    label: 'AM In',
    session: 'Morning In',
    time: settings?.mornIn,
    fineAmount: Number(settings?.fineAMIn || 0)
  },
  AM_OUT: {
    key: 'AM_OUT',
    label: 'AM Out',
    session: 'Morning Out',
    time: settings?.mornOut,
    fineAmount: Number(settings?.fineAMOut || 0)
  },
  PM_IN: {
    key: 'PM_IN',
    label: 'PM In',
    session: 'Afternoon In',
    time: settings?.aftIn,
    fineAmount: Number(settings?.finePMIn || 0)
  },
  PM_OUT: {
    key: 'PM_OUT',
    label: 'PM Out',
    session: 'Afternoon Out',
    time: settings?.aftOut,
    fineAmount: Number(settings?.finePMOut || 0)
  }
});

const getEventWindowCodes = (settings) => {
  if (settings?.eventMode === 'MORNING') return ['AM_IN', 'AM_OUT'];
  if (settings?.eventMode === 'AFTERNOON') return ['PM_IN', 'PM_OUT'];
  return ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT'];
};

const normalizeSettingsPayload = (payload = {}) => ({
  ...payload
});

const validateSettingsSchedule = (settings) => {
  const mornInMin = parseTimeToMinutes(settings.mornIn);
  const mornOutMin = parseTimeToMinutes(settings.mornOut);
  const aftInMin = parseTimeToMinutes(settings.aftIn);
  const aftOutMin = parseTimeToMinutes(settings.aftOut);

  if (settings.eventMode === 'MORNING') {
    if (mornInMin === null || mornOutMin === null) return { valid: false, message: "Morning In and Morning Out times are required." };
    if (mornInMin >= mornOutMin) return { valid: false, message: "AM In time must be before AM Out time." };
  } else if (settings.eventMode === 'AFTERNOON') {
    if (aftInMin === null || aftOutMin === null) return { valid: false, message: "Afternoon In and Afternoon Out times are required." };
    if (aftInMin >= aftOutMin) return { valid: false, message: "PM In time must be before PM Out time." };
  } else {
    if (mornInMin === null || mornOutMin === null || aftInMin === null || aftOutMin === null) {
      return { valid: false, message: "All session times (AM In, AM Out, PM In, PM Out) are required for whole day events." };
    }
    if (mornInMin >= mornOutMin) return { valid: false, message: "AM In time must be before AM Out time." };
    if (mornOutMin >= aftInMin) return { valid: false, message: "AM Out time must be before PM In time." };
    if (aftInMin >= aftOutMin) return { valid: false, message: "PM In time must be before PM Out time." };
  }
  return { valid: true };
};

const getScanSession = (settings, nowMinutes) => {
  if (!settings) return "Outside Buffer";

  if (settings.activeWindow) {
    if (settings.activeWindow === 'AM_IN') return "Morning In";
    if (settings.activeWindow === 'AM_OUT') return "Morning Out";
    if (settings.activeWindow === 'PM_IN') return "Afternoon In";
    if (settings.activeWindow === 'PM_OUT') return "Afternoon Out";
  }

  const mornInMin = parseTimeToMinutes(settings.mornIn);
  const mornOutMin = parseTimeToMinutes(settings.mornOut);
  const aftInMin = parseTimeToMinutes(settings.aftIn);
  const aftOutMin = parseTimeToMinutes(settings.aftOut);

  if (settings.eventMode === 'MORNING') {
    if (mornInMin !== null && nowMinutes <= mornInMin) return "Morning In";
    return "Morning Out";
  } else if (settings.eventMode === 'AFTERNOON') {
    if (aftInMin !== null && nowMinutes <= aftInMin) return "Afternoon In";
    return "Afternoon Out";
  } else {
    if (mornInMin !== null && nowMinutes <= mornInMin) return "Morning In";
    if (mornOutMin !== null && nowMinutes <= mornOutMin) return "Morning Out";
    if (aftInMin !== null && nowMinutes <= aftInMin) return "Afternoon In";
    return "Afternoon Out";
  }
};

const getEventLastEnd = (settings) => {
  if (!settings) return null;
  const mornOutMin = parseTimeToMinutes(settings.mornOut);
  const aftOutMin = parseTimeToMinutes(settings.aftOut);
  if (settings.eventMode === 'MORNING') return mornOutMin;
  if (settings.eventMode === 'AFTERNOON') return aftOutMin;
  return aftOutMin;
};

const isSameOrEarlierDate = (dateString) => {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(dateString);
  eventDate.setHours(0, 0, 0, 0);
  return eventDate.getTime() <= today.getTime();
};

// 3. MIDDLEWARES
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 4. SOCKET.IO CONFIG
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const emitFineRefresh = (payload = {}) => {
  io.emit('fines-updated', payload);
  io.emit('fine-updated', payload);
};

io.on('connection', (socket) => {
  console.log(`🔌 Socket Connected: ${socket.id}`);
});

// 5. DATABASE CONNECTION
mongoose.connect('mongodb://127.0.0.1:27017/clearanceDB')
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// --- HELPER: ARCHIVE EVENT ---
const archiveEvent = async (settings) => {
  if (!settings || !settings.activeEvent) return;
  console.log(`📦 Archiving Event: ${settings.activeEvent}`);
  try {
    const attendees = await AttendanceLog.find({ eventName: settings.activeEvent });
    let query = { organization: settings.selectedOrg };
    if (settings.selectedSubOrg) query.subOrganization = settings.selectedSubOrg;
    const studentsInScope = await Student.find(query);
    const windowsByCode = getWindowConfig(settings);
    const absenteeRecords = [];

    getEventWindowCodes(settings).forEach((windowCode) => {
      const window = windowsByCode[windowCode];
      if (!window) return;
      const attendeeUids = attendees
        .filter(a => a.session === window.session && a.status !== 'Absent')
        .map(a => a.rfidUid ? a.rfidUid.toString().replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase() : "");

      studentsInScope
        .filter(s => {
          const cleanStudentUid = s.rfidUid ? s.rfidUid.toString().replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase() : "";
          return !attendeeUids.includes(cleanStudentUid);
        })
        .forEach(s => {
          absenteeRecords.push({
            studentId: s.studentId,
            name: s.name,
            missedSession: window.label,
            fineAmount: window.fineAmount || 0
          });
        });
    });

    // Create fine records for each absentee and generate Absent logs
    for (const rec of absenteeRecords) {
      const student = await Student.findOne({ studentId: rec.studentId });
      if (student) {
        const dateParts = settings.eventDate.split('-');
        const endOfEventDay = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59, 999);
        
        await AttendanceLog.findOneAndUpdate(
          {
            studentId: student.studentId,
            eventName: settings.activeEvent,
            session: rec.missedSession,
            status: 'Absent'
          },
          {
            $setOnInsert: {
              studentId: student.studentId,
              rfidUid: student.rfidUid,
              studentName: student.name,
              action: 'Absent',
              status: 'Absent',
              session: rec.missedSession,
              eventName: settings.activeEvent,
              timestamp: endOfEventDay
            }
          },
          { upsert: true, new: true }
        );

        if (rec.fineAmount > 0) {
          await addFineRecord(
            student,
            settings.activeEvent,
            rec.fineAmount,
            settings.selectedOrg,
            settings.selectedSubOrg || '',
            `Auto-applied on archiving for missed ${rec.missedSession}`,
            rec.missedSession
          );
        }
      }
    }

    const historyRecord = new Event({
      name: settings.activeEvent,
      date: new Date(settings.eventDate),
      organization: settings.selectedOrg,
      subOrganization: settings.selectedSubOrg,
      eventMode: settings.eventMode,
      attendees: attendees.map(a => ({
        studentId: a.rfidUid,
        name: a.studentName,
        session: a.session,
        timestamp: a.timestamp
      })),
      absentees: absenteeRecords,
      totalFines: absenteeRecords.reduce((sum, record) => sum + (record.fineAmount || 0), 0),
      isFinished: true
    });

    await historyRecord.save();
    console.log(`✅ Event archived successfully.`);
  } catch (err) { console.error("❌ Archiving Error:", err); }
};

// 6. API ROUTES

// Settings Routes
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.findOne().sort({ _id: -1 });
    res.json(settings || {});
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/settings', async (req, res) => {
  try {
    if (!req.body) return res.status(400).send("Missing request body");
    const oldSettings = await Settings.findOne();
    const newSettings = normalizeSettingsPayload(req.body);

    const validation = validateSettingsSchedule(newSettings);
    if (!validation.valid) return res.status(400).send(validation.message);

    // Check if manually stopping
    if (oldSettings?.isEventSaved && newSettings.isEventSaved === false && oldSettings.activeWindow === 'AM_OUT') {
      await archiveEvent(oldSettings);
    }

    await Settings.findOneAndUpdate({}, { ...newSettings, processedWindows: newSettings.processedWindows || [] }, { upsert: true });
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

// Student Routes
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/students/add/scan', async (req, res) => {
  try {
    const { rfidUid, studentId, name, course, year, organization, subOrganization } = req.body || {};
    const cleanUid = rfidUid ? rfidUid.toString().replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase() : "";
    const existing = await Student.findOne({ $or: [{ studentId }, { rfidUid: cleanUid }] });
    if (existing) return res.status(400).json({ error: "Duplicate Student ID or RFID!" });

    const newStudent = new Student({
      studentId, name, rfidUid: cleanUid, course, year,
      organization, subOrganization: subOrganization || "",
      fines: { total: 0, isPaid: true }, clearanceStatus: {}
    });
    await newStudent.save();
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/students/:id', async (req, res) => {
  try {
    const updated = await Student.findOneAndUpdate({ studentId: req.params.id }, { $set: req.body }, { new: true });
    if (updated) {
      io.emit('student-updated', updated);
      res.status(200).json(updated);
    } else { res.status(404).send('Not found'); }
  } catch (err) { res.status(500).send(err.message); }
});

// Blockchain: Update Clearance and Log to Blockchain
app.put('/api/students/update-clearance/:id', async (req, res) => {
  try {
    const { clearanceStatus } = req.body;
    const studentId = req.params.id;

    // 1. Update the student in MongoDB
    const updatedStudent = await Student.findOneAndUpdate(
      { studentId: studentId },
      { $set: { clearanceStatus: clearanceStatus } },
      { new: true }
    );

    if (!updatedStudent) return res.status(404).send('Student not found');

    // 2. Create a new Block for the Blockchain
    const newBlock = new Block(
      new Date().toISOString(),
      studentId,
      clearanceStatus // Will be stringified in the constructor
    );

    // 3. Add the block to the blockchain securely
    await blockchain.addBlock(newBlock);

    io.emit('student-updated', updatedStudent);
    res.status(200).json({ success: true, student: updatedStudent });
  } catch (err) {
    console.error("Clearance Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Blockchain: View entire chain
app.get('/api/blockchain', async (req, res) => {
  try {
    const chain = await require('./models/blockchainRecord').find().sort({ _id: 1 });
    res.json(chain);
  } catch (err) { res.status(500).send(err.message); }
});

// Blockchain: Validate chain integrity
app.get('/api/blockchain/validate', async (req, res) => {
  try {
    const isValid = await blockchain.isChainValid();
    res.json({ valid: isValid });
  } catch (err) { res.status(500).send(err.message); }
});

// Blockchain: Get statistics
app.get('/api/blockchain/stats', async (req, res) => {
  try {
    const { getBlockchainStats } = require('./utils/blockchainValidator');
    const stats = await getBlockchainStats();
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Blockchain: Get hash chain
app.get('/api/blockchain/chain', async (req, res) => {
  try {
    const { getHashChain } = require('./utils/blockchainValidator');
    const chain = await getHashChain();
    res.json(chain);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Blockchain: Detect tampering
app.get('/api/blockchain/detect-tampering', async (req, res) => {
  try {
    const { detectTampering } = require('./utils/blockchainValidator');
    const result = await detectTampering();
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Blockchain: Validate specific block
app.get('/api/blockchain/validate/:blockId', async (req, res) => {
  try {
    const { validateBlock } = require('./utils/blockchainValidator');
    const result = await validateBlock(req.params.blockId);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Blockchain: Update Clearance and Log to Blockchain
app.put('/api/students/update-clearance/:id', async (req, res) => {
  try {
    const { clearanceStatus } = req.body;
    const studentId = req.params.id;

    // 1. Update the student in MongoDB
    const updatedStudent = await Student.findOneAndUpdate(
      { studentId: studentId },
      { $set: { clearanceStatus: clearanceStatus } },
      { new: true }
    );

    if (!updatedStudent) return res.status(404).send('Student not found');

    // 2. Create a new Block for the Blockchain
    const newBlock = new Block(
      new Date().toISOString(),
      studentId,
      clearanceStatus
    );

    // 3. Add the block to the blockchain securely
    await blockchain.addBlock(newBlock);

    io.emit('student-updated', updatedStudent);
    res.status(200).json({ success: true, student: updatedStudent });
  } catch (err) {
    console.error("Clearance Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});

const fs = require('fs');
const path = require('path');

app.use(['/api/scan', '/api/attendance/scan'], (req, res, next) => {
  const logMsg = `\n[${new Date().toISOString()}] SCAN REQ: ${req.method} ${req.originalUrl}\nHeaders: ${JSON.stringify(req.headers)}\nBody: ${JSON.stringify(req.body)}\n`;
  try {
    fs.appendFileSync(path.join(__dirname, 'scan_debug.log'), logMsg);
  } catch (err) {
    console.error("Failed to write to scan_debug.log", err);
  }
  next();
});

// Attendance Routes
app.get('/api/attendance/logs', async (req, res) => {
  try {
    const logs = await AttendanceLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/attendance/scan', async (req, res) => {
  const settings = await Settings.findOne();
  handleScan(req, res, io, settings);
});

app.post('/api/scan', async (req, res) => {
  const settings = await Settings.findOne();
  handleScan(req, res, io, settings);
});

// Event History API
app.get('/api/events/history', async (req, res) => {
  try {
    const history = await Event.find().sort({ createdAt: -1 });
    res.json(history);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Reset Fines
app.post('/api/admin/reset-fines', async (req, res) => {
  try {
    await Student.updateMany({}, { $set: { "fines.total": 0, "fines.isPaid": true, fineHistory: [], finesActive: [], totalUncollectedFines: 0, totalCollectedFines: 0 } });
    emitFineRefresh({ reason: 'reset-fines' });
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

// --- BLOCKCHAIN FINE UTILITIES ---

const cascadeUpdateFineChain = async (startingBlockId) => {
  try {
    const chain = await require('./models/blockchainRecord').find({ type: 'fine' }).sort({ _id: 1 });
    let startIndex = chain.findIndex(b => b._id.toString() === startingBlockId.toString());
    if (startIndex === -1) return;

    for (let i = startIndex; i < chain.length; i++) {
      const currentBlock = chain[i];
      if (i > 0) {
        const previousBlock = chain[i - 1];
        currentBlock.previousHash = previousBlock.currentHash;
      }
      
      const hashInput = currentBlock.studentId + currentBlock.event + currentBlock.amount + currentBlock.status + currentBlock.timestamp + currentBlock.previousHash;
      currentBlock.currentHash = generateSHA256(hashInput);
      
      await currentBlock.save();

      await Student.updateOne(
        { studentId: currentBlock.studentId, "finesActive._id": currentBlock.fineId },
        {
          $set: {
            "finesActive.$.previousHash": currentBlock.previousHash,
            "finesActive.$.currentHash": currentBlock.currentHash
          }
        }
      );
    }
    console.log("⛓️ Fine blockchain cascade resigned successfully.");
  } catch (err) {
    console.error("❌ Cascade Update Error:", err);
  }
};

const recalculateStudentFineTotals = (student) => {
  const activeFines = student.finesActive || [];
  const totalUncollected = activeFines
    .filter(f => f.status === 'active' || f.status === 'pending')
    .reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalCollected = activeFines
    .filter(f => f.status === 'approved' || f.status === 'collected')
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  student.totalUncollectedFines = totalUncollected;
  student.totalCollectedFines = totalCollected;
  student.fines = student.fines || { total: 0, isPaid: true };
  student.fines.total = totalUncollected + totalCollected;
  student.fines.isPaid = totalUncollected === 0;
};

const addFineRecord = async (student, eventName, amount, organization, subOrganization, notes, attendancePhase) => {
  const existingFine = (student.finesActive || []).find(fine =>
    fine.eventName === eventName &&
    (fine.attendancePhase || '') === (attendancePhase || '') &&
    (fine.status === 'active' || fine.status === 'pending')
  );

  if (existingFine) return existingFine;

  const fineObj = {
    eventName,
    organization,
    subOrganization: subOrganization || '',
    amount,
    status: 'active',
    dateIssued: new Date(),
    notes: notes || '',
    attendancePhase: attendancePhase || '',
    previousHash: '',
    currentHash: ''
  };

  student.finesActive.push(fineObj);
  await student.save();

  const newFine = student.finesActive[student.finesActive.length - 1];

  const timestampStr = new Date().toISOString().split('T')[0];
  const newBlock = new Block(
    timestampStr,
    student.studentId,
    'UNPAID',
    '',
    'fine',
    eventName,
    amount
  );
  newBlock.fineId = newFine._id.toString();

  const savedBlock = await blockchain.addBlock(newBlock);

  newFine.previousHash = savedBlock.previousHash;
  newFine.currentHash = savedBlock.currentHash;

  recalculateStudentFineTotals(student);

  await student.save();
  return newFine;
};

// --- FINE MANAGEMENT ENDPOINTS ---

// GET /api/fines/summary - Get collections summary
app.get('/api/fines/summary', async (req, res) => {
  try {
    const students = await Student.find();
    let totalUncollected = 0;
    let totalCollected = 0;
    const byOrganization = {};

    students.forEach(student => {
      const org = student.organization || 'Unknown';
      if (!byOrganization[org]) {
        byOrganization[org] = { uncollected: 0, collected: 0 };
      }

      student.finesActive?.forEach(fine => {
        const amount = fine.amount || 0;
        if (fine.status === 'active' || fine.status === 'pending') {
          totalUncollected += amount;
          byOrganization[org].uncollected += amount;
        } else if (fine.status === 'approved' || fine.status === 'collected') {
          totalCollected += amount;
          byOrganization[org].collected += amount;
        }
      });
    });

    res.json({ totalUncollected, totalCollected, byOrganization });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/fines/student/:studentId - Get student's fines
app.get('/api/fines/student/:studentId', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const uncollected = student.finesActive?.filter(f => f.status === 'active' || f.status === 'pending') || [];
    const collected = student.finesActive?.filter(f => f.status === 'approved' || f.status === 'collected') || [];

    res.json({
      uncollected,
      collected,
      totalUncollected: student.totalUncollectedFines ?? uncollected.reduce((s, f) => s + (f.amount || 0), 0),
      totalCollected: student.totalCollectedFines ?? collected.reduce((s, f) => s + (f.amount || 0), 0)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/fines/edit - Admin edits the fine amount manually
app.put('/api/fines/edit', async (req, res) => {
  try {
    const { studentId, fineId, newAmount } = req.body;

    if (newAmount === undefined || newAmount === null || newAmount === '') {
      return res.status(400).json({ error: "Amount cannot be empty" });
    }
    const amountNum = Number(newAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      return res.status(400).json({ error: "Amount cannot be negative" });
    }

    const student = await Student.findOne({ studentId });
    if (!student) return res.status(404).json({ error: "Student not found" });

    const fine = student.finesActive.id(fineId);
    if (!fine) return res.status(404).json({ error: "Fine record not found" });

    const block = await require('./models/blockchainRecord').findOne({ fineId: fineId.toString() });
    
    // Update amount in student schema
    fine.amount = amountNum;

    if (block) {
      block.amount = amountNum;
      const blockStatus = fine.status === 'collected' || fine.status === 'approved' ? 'PAID' : 'UNPAID';
      block.status = blockStatus;
      
      const hashInput = block.studentId + block.event + block.amount + block.status + block.timestamp + block.previousHash;
      block.currentHash = generateSHA256(hashInput);
      await block.save();
      
      fine.currentHash = block.currentHash;
    }
    
    await student.save();

    if (block) {
      await cascadeUpdateFineChain(block._id);
    }

    // Recalculate aggregates
    const freshStudent = await Student.findOne({ studentId });
    const totalUncollected = freshStudent.finesActive
      .filter(f => f.status === 'active' || f.status === 'pending')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalCollected = freshStudent.finesActive
      .filter(f => f.status === 'approved' || f.status === 'collected')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    freshStudent.totalUncollectedFines = totalUncollected;
    freshStudent.totalCollectedFines = totalCollected;
    freshStudent.fines.total = totalUncollected + totalCollected;
    freshStudent.fines.isPaid = totalUncollected === 0;
    await freshStudent.save();

    emitFineRefresh({ reason: 'fine-edited' });
    io.emit('student-updated', freshStudent);

    res.json({ success: true, student: freshStudent });
  } catch (err) {
    console.error("Edit Fine Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fines/uncollected/all - Admin gets all uncollected fines (active or pending)
app.get('/api/fines/uncollected/all', async (req, res) => {
  try {
    const students = await Student.find({});
    const uncollected = [];

    students.forEach(student => {
      student.finesActive?.forEach(fine => {
        if (fine.status === 'active' || fine.status === 'pending') {
          uncollected.push({
            _id: `${student.studentId}-${fine._id}`,
            studentId: student.studentId,
            studentName: student.name,
            eventName: fine.eventName,
            organization: fine.organization,
            subOrganization: fine.subOrganization || '',
            amount: fine.amount,
            status: fine.status,
            dateIssued: fine.dateIssued,
            studentMarkedPaidAt: fine.studentMarkedPaidAt,
            notes: fine.notes,
            attendancePhase: fine.attendancePhase || '',
            previousHash: fine.previousHash || '',
            currentHash: fine.currentHash || ''
          });
        }
      });
    });

    const totalAmount = uncollected.reduce((sum, f) => sum + f.amount, 0);

    res.json({
      uncollected: uncollected.sort((a, b) =>
        new Date(b.dateIssued) - new Date(a.dateIssued)
      ),
      totalAmount,
      totalRecords: uncollected.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fines/apply - Record fine for absent students manually
app.post('/api/fines/apply', async (req, res) => {
  try {
    const { eventName, organization, subOrganization, fineAmount, absentStudentIds } = req.body;

    if (!eventName || !organization || !fineAmount || !absentStudentIds) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const updatedStudents = [];
    for (const studentId of absentStudentIds) {
      const student = await Student.findOne({ studentId });
      if (student) {
        await addFineRecord(
          student,
          eventName,
          Number(fineAmount),
          organization,
          subOrganization || '',
          'Manually applied'
        );
        updatedStudents.push(student);
      }
    }

    emitFineRefresh({ reason: 'manual-fines-applied' });
    res.json({ success: true, updatedCount: updatedStudents.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student marks fine as paid (via studentId + fineIndex)
app.put('/api/fines/:studentId/:fineIndex/mark-paid', async (req, res) => {
  try {
    const { studentId, fineIndex } = req.params;
    const student = await Student.findOne({ studentId });

    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!student.finesActive[fineIndex]) return res.status(404).json({ error: 'Fine not found' });

    student.finesActive[fineIndex].status = 'pending';
    student.finesActive[fineIndex].studentMarkedPaidAt = new Date();
    await student.save();

    emitFineRefresh({ fineId: student.finesActive[fineIndex]._id, status: 'pending' });
    io.emit('student-updated', student);

    res.json({ success: true, fine: student.finesActive[fineIndex], student });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/fines/:fineId/mark-paid - Student marks fine as paid (via fineId)
app.put('/api/fines/:fineId/mark-paid', async (req, res) => {
  try {
    const result = await Student.findOneAndUpdate(
      { 'finesActive._id': req.params.fineId },
      {
        $set: {
          'finesActive.$.status': 'pending',
          'finesActive.$.studentMarkedPaidAt': new Date()
        }
      },
      { new: true }
    );
    if (!result) return res.status(404).json({ error: 'Fine not found' });
    emitFineRefresh({ fineId: req.params.fineId, status: 'pending' });
    io.emit('student-updated', result);
    res.json({ success: true, student: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin approves payment (via studentId + fineIndex)
app.put('/api/fines/:studentId/:fineIndex/approve-payment', async (req, res) => {
  try {
    const { studentId, fineIndex } = req.params;
    const student = await Student.findOne({ studentId });

    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!student.finesActive[fineIndex]) return res.status(404).json({ error: 'Fine not found' });

    const fine = student.finesActive[fineIndex];
    fine.status = 'collected';
    fine.adminApprovedAt = new Date();

    const block = await require('./models/blockchainRecord').findOne({ fineId: fine._id.toString() });
    if (block) {
      block.status = 'PAID';
      const hashInput = block.studentId + block.event + block.amount + block.status + block.timestamp + block.previousHash;
      block.currentHash = generateSHA256(hashInput);
      await block.save();

      fine.currentHash = block.currentHash;
      await student.save();

      // Cascade update subsequent blocks to keep the blockchain valid
      await cascadeUpdateFineChain(block._id);
    } else {
      await student.save();
    }

    // Recalculate aggregates
    const freshStudent = await Student.findOne({ studentId });
    const totalUncollected = freshStudent.finesActive
      .filter(f => f.status === 'active' || f.status === 'pending')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalCollected = freshStudent.finesActive
      .filter(f => f.status === 'approved' || f.status === 'collected')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    freshStudent.totalUncollectedFines = totalUncollected;
    freshStudent.totalCollectedFines = totalCollected;
    freshStudent.fines.total = totalUncollected + totalCollected;
    freshStudent.fines.isPaid = totalUncollected === 0;
    await freshStudent.save();

    emitFineRefresh({ fineId: fine._id, status: 'collected' });
    io.emit('student-updated', freshStudent);

    res.json({ success: true, fine, student: freshStudent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/fines/:fineId/approve-payment - Admin approves payment (via fineId)
app.put('/api/fines/:fineId/approve-payment', async (req, res) => {
  try {
    const fineId = req.params.fineId;
    const student = await Student.findOne({ 'finesActive._id': fineId });
    if (!student) return res.status(404).json({ error: 'Fine not found' });

    const fine = student.finesActive.id(fineId);
    fine.status = 'collected';
    fine.adminApprovedAt = new Date();

    const block = await require('./models/blockchainRecord').findOne({ fineId: fineId });
    if (block) {
      block.status = 'PAID';
      const hashInput = block.studentId + block.event + block.amount + block.status + block.timestamp + block.previousHash;
      block.currentHash = generateSHA256(hashInput);
      await block.save();

      fine.currentHash = block.currentHash;
      await student.save();

      // Cascade update subsequent blocks
      await cascadeUpdateFineChain(block._id);
    } else {
      await student.save();
    }

    // Recalculate aggregates
    const freshStudent = await Student.findOne({ _id: student._id });
    const totalUncollected = freshStudent.finesActive
      .filter(f => f.status === 'active' || f.status === 'pending')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalCollected = freshStudent.finesActive
      .filter(f => f.status === 'approved' || f.status === 'collected')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const updatedStudent = await Student.findOneAndUpdate(
      { _id: freshStudent._id },
      {
        $set: {
          totalUncollectedFines: totalUncollected,
          totalCollectedFines: totalCollected,
          "fines.total": totalUncollected + totalCollected,
          "fines.isPaid": totalUncollected === 0
        }
      },
      { new: true }
    );

    // Emit both events so App.tsx can refresh state in real-time
    emitFineRefresh({ fineId: fineId, status: 'collected' });
    if (updatedStudent) io.emit('student-updated', updatedStudent);

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/fines/collections - Get all collected fines for admin
app.get('/api/fines/collections', async (req, res) => {
  try {
    const students = await Student.find();
    const collected = [];
    let totalAmount = 0;

    students.forEach(student => {
      student.finesActive?.forEach(fine => {
        if (fine.status === 'approved' || fine.status === 'collected') {
          collected.push({
            _id: fine._id,
            eventName: fine.eventName,
            organization: fine.organization || student.organization,
            subOrganization: fine.subOrganization || student.subOrganization || '',
            amount: fine.amount,
            status: fine.status,
            dateIssued: fine.dateIssued,
            studentMarkedPaidAt: fine.studentMarkedPaidAt,
            adminApprovedAt: fine.adminApprovedAt,
            notes: fine.notes,
            attendancePhase: fine.attendancePhase || '',
            studentId: student.studentId,
            studentName: student.name,
            previousHash: fine.previousHash || '',
            currentHash: fine.currentHash || ''
          });
          totalAmount += fine.amount || 0;
        }
      });
    });

    res.json({ collected, totalAmount, totalRecords: collected.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. BACKGROUND JOB: AUTO-FINE & AUTO-STOP
setInterval(async () => {
  try {
    const settings = await Settings.findOne();
    if (!settings || !settings.isEventSaved) return;

    const now = new Date();
    // Get local date string YYYY-MM-DD
    const localYear = now.getFullYear();
    const localMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const localDay = now.getDate().toString().padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDay}`;

    // Only run auto-fine logic on or after the scheduled event date!
    if (settings.eventDate > todayStr) return;

    const isPastEvent = settings.eventDate < todayStr;
    const current = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    const checkAndApplyFine = async (windowCode, sessionName, deadline, fineAmount, phaseName) => {
      if (!deadline) return;
      const isPastDeadline = isPastEvent || current >= deadline;
      if (isPastDeadline && (!settings.processedWindows || !settings.processedWindows.includes(windowCode))) {
        console.log(`[Auto-Fine] Processing ${sessionName} (deadline: ${deadline}, current: ${current}, isPastEvent: ${isPastEvent})...`);

        let query = { organization: settings.selectedOrg };
        if (settings.selectedSubOrg) query.subOrganization = settings.selectedSubOrg;
        const studentsInScope = await Student.find(query);

        // Fetch logs only from the event date to prevent matching logs from other events/dates!
        const dateParts = settings.eventDate.split('-');
        const startOfEventDay = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0);
        const endOfEventDay = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59, 999);

        const attendees = await AttendanceLog.find({
          eventName: settings.activeEvent,
          session: sessionName,
          status: { $ne: 'Absent' },
          timestamp: { $gte: startOfEventDay, $lte: endOfEventDay }
        });
        const attendeeUids = attendees.map(a => a.rfidUid ? a.rfidUid.toString().replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase() : "");
        const absentees = studentsInScope.filter(s => {
          const cleanStudentUid = s.rfidUid ? s.rfidUid.toString().replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase() : "";
          return !attendeeUids.includes(cleanStudentUid);
        });

        if (absentees.length > 0) {
          for (const s of absentees) {
            const student = await Student.findOne({ studentId: s.studentId });
            if (student) {
              await AttendanceLog.findOneAndUpdate(
                {
                  studentId: student.studentId,
                  eventName: settings.activeEvent,
                  session: sessionName,
                  status: 'Absent',
                  timestamp: { $gte: startOfEventDay, $lte: endOfEventDay }
                },
                {
                  $setOnInsert: {
                    studentId: student.studentId,
                    rfidUid: student.rfidUid,
                    studentName: student.name,
                    action: 'Absent',
                    status: 'Absent',
                    session: sessionName,
                    eventName: settings.activeEvent,
                    timestamp: endOfEventDay
                  }
                },
                { upsert: true, new: true }
              );

              // Only generate the Absent attendance log during the event; do not add fine records yet.
            }
          }
        }
        await Settings.updateOne({}, { $addToSet: { processedWindows: windowCode } });
        emitFineRefresh({ reason: 'auto-fines-generated', windowCode });
      }
    };

    const activeWindowMap = {
      AM_IN: { sessionName: 'Morning In', deadline: settings.mornIn, fineAmount: settings.fineAMIn, phaseName: 'AM In' },
      AM_OUT: { sessionName: 'Morning Out', deadline: settings.mornOut, fineAmount: settings.fineAMOut, phaseName: 'AM Out' },
      PM_IN: { sessionName: 'Afternoon In', deadline: settings.aftIn, fineAmount: settings.finePMIn, phaseName: 'PM In' },
      PM_OUT: { sessionName: 'Afternoon Out', deadline: settings.aftOut, fineAmount: settings.finePMOut, phaseName: 'PM Out' }
    };

    // Determine windows to check based on eventMode
    let windowsToCheck = [];
    if (settings.eventMode === 'MORNING') {
      windowsToCheck = ['AM_IN', 'AM_OUT'];
    } else if (settings.eventMode === 'AFTERNOON') {
      windowsToCheck = ['PM_IN', 'PM_OUT'];
    } else {
      windowsToCheck = ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT'];
    }

    for (const windowCode of windowsToCheck) {
      const active = activeWindowMap[windowCode];
      if (active) {
        await checkAndApplyFine(windowCode, active.sessionName, active.deadline, active.fineAmount, active.phaseName);
      }
    }

    // AUTO-STOP ARCHIVING
    const freshSettings = await Settings.findOne();
    const processed = freshSettings.processedWindows || [];
    const isFinished = windowsToCheck.every(w => processed.includes(w));

    if (isFinished && freshSettings.isEventSaved) {
      console.log(`⏰ All active windows (${windowsToCheck.join(', ')}) processed; auto-archiving event.`);
      await archiveEvent(freshSettings);
      await Settings.updateOne({}, { $set: { isEventSaved: false, activeWindow: '', processedWindows: [] } });
      emitFineRefresh({ reason: 'event-archived' });
    }
  } catch (err) { console.error("[Background Job Error]", err); }
}, 5001);

// 8. SERVER START
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CampusSync Backend Running on Port ${PORT}`);
  bonjour.publish({ name: 'CampusSync', type: 'http', port: PORT, host: 'campussync.local' });
});
