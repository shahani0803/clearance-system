const mongoose = require('mongoose');

// ---------- Schemas ----------
const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, default: Date.now },
  organization: String,
  subOrganization: String,
  eventMode: String,
  attendees: [{
    studentId: String,
    name: String,
    session: String,
    timestamp: Date
  }],
  absentees: [{
    studentId: String,
    name: String,
    missedSession: String,
    fineAmount: Number
  }],
  totalFines: { type: Number, default: 0 },
  isFinished: { type: Boolean, default: false }
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  course: String,
  year: { type: Number, required: true },
  rfidUid: { type: String, required: true, unique: true },
  profilePic: String,
  organization: { type: String, enum: ['CCS', 'ESO', 'NABA'], default: 'CCS' },
  subOrganization: { type: String, default: '' },
  fines: { total: { type: Number, default: 0 }, isPaid: { type: Boolean, default: true } },
  clearanceStatus: { type: Map, of: Boolean, default: {} },
  totalFines: { type: Number, default: 0 },
  fineHistory: [{ event: String, amount: Number, date: { type: Date, default: Date.now } }],
  finesActive: [{
    eventName: String,
    organization: String,
    subOrganization: String,
    amount: Number,
    status: { type: String, enum: ['active', 'pending', 'approved', 'collected'], default: 'active' },
    dateIssued: { type: Date, default: Date.now },
    studentMarkedPaidAt: Date,
    adminApprovedAt: Date,
    notes: String,
    attendancePhase: String,
    previousHash: { type: String, default: '' },
    currentHash: { type: String, default: '' }
  }],
  totalUncollectedFines: { type: Number, default: 0 },
  totalCollectedFines: { type: Number, default: 0 }
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);

const attendanceLogSchema = new mongoose.Schema({
  studentId: String,
  rfidUid: String,
  studentName: String,
  action: String,
  status: { type: String, enum: ['Present', 'Absent', 'Success', 'Failed'], default: 'Present' },
  session: String,
  eventName: String,
  timestamp: { type: Date, default: Date.now }
});

const AttendanceLog = mongoose.model('AttendanceLog', attendanceLogSchema);

// ---------- Fine Utility ----------
const addFineRecord = async (student, eventName, amount, organization, subOrg, notes, attendancePhase) => {
  // Prevent duplicate active fine for same event/phase
  const existing = (student.finesActive || []).find(f =>
    f.eventName === eventName &&
    (f.attendancePhase || '') === (attendancePhase || '') &&
    (f.status === 'active' || f.status === 'pending')
  );
  if (existing) return existing;

  const fineObj = {
    eventName,
    organization,
    subOrganization: subOrg || '',
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

  // Blockchain entry (simplified – actual block creation handled elsewhere)
  // Recalculate totals after adding fine
  const totalUncollected = student.finesActive
    .filter(f => f.status === 'active' || f.status === 'pending')
    .reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalCollected = student.finesActive
    .filter(f => f.status === 'approved' || f.status === 'collected')
    .reduce((sum, f) => sum + (f.amount || 0), 0);
  student.totalUncollectedFines = totalUncollected;
  student.totalCollectedFines = totalCollected;
  student.fines.total = totalUncollected + totalCollected;
  student.fines.isPaid = totalUncollected === 0;
  await student.save();
  return fineObj;
};

// ---------- Helper Functions for Scans ----------
const toMinutes = (time) => {
  if (!time) return null;
  const [hour, minute] = time.split(':');
  if (hour === undefined || minute === undefined) return null;
  const h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

const getScanSession = (settings, nowMinutes) => {
  if (!settings) return "Outside Buffer";

  if (settings.activeWindow) {
    if (settings.activeWindow === 'AM_IN') return "Morning In";
    if (settings.activeWindow === 'AM_OUT') return "Morning Out";
    if (settings.activeWindow === 'PM_IN') return "Afternoon In";
    if (settings.activeWindow === 'PM_OUT') return "Afternoon Out";
  }

  const mornInMin = toMinutes(settings.mornIn);
  const mornOutMin = toMinutes(settings.mornOut);
  const aftInMin = toMinutes(settings.aftIn);
  const aftOutMin = toMinutes(settings.aftOut);

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

// ---------- Scan Handler ----------
const handleScan = async (req, res, io, settings) => {
  try {
    const now = new Date();
    const { rfidUid, eventName } = req.body;
    const cleanUid = rfidUid ? rfidUid.toString().replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase() : "";
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentTimeInt = now.getHours() * 100 + now.getMinutes();

    console.log('\n--- 📡 SCAN RECEIVED ---');
    console.log(`UID: [${cleanUid}]`);
    console.log(`Time: ${now.toLocaleTimeString()}`);
    console.log(`Settings Active: ${settings ? 'YES' : 'NO'}`);
    if (settings) console.log(`Event Scope: ${settings.selectedOrg} | ${settings.selectedSubOrg || 'All'}`);

    // Find student
    let student = await Student.findOne({ rfidUid: cleanUid });
    if (!student && cleanUid) {
      console.log('🔍 Exact match failed. Trying case-insensitive regex...');
      student = await Student.findOne({ rfidUid: { $regex: new RegExp(`^${cleanUid}$`, 'i') } });
    }
    if (!student) {
      console.log(`⚠️ REJECTED: UID [${cleanUid}] not found in database.`);
      if (io) io.emit('unregistered-scan', { rfidUid: cleanUid });
      return res.status(404).json({ success: false, message: "Student not registered!", rfidUid: cleanUid });
    }

    // Scope checks (optional – assume settings contain selectedOrg/SubOrg)
    if (settings) {
      const studentOrg = student.organization;
      const selectedOrg = settings.selectedOrg;
      const selectedSubOrg = settings.selectedSubOrg || '';
      const studentSubOrg = student.subOrganization || '';
      if (studentOrg !== selectedOrg) {
        console.log(`🚫 SCOPE WARNING: Student org ${studentOrg} differs from event org ${selectedOrg}`);
        // continue without rejecting
      }
      if (selectedSubOrg && studentSubOrg !== selectedSubOrg) {
        console.log(`🚫 SCOPE WARNING: Student subOrg ${studentSubOrg} differs from event subOrg ${selectedSubOrg}`);
        // continue without rejecting
      }
    }

    // Determine session
    let finalEventName = eventName || (settings ? settings.activeEvent : "General Event");
    let scanType = "Outside Buffer";
    if (settings && settings.isEventSaved) {
      scanType = getScanSession(settings, currentMinutes);
    } else {
      if (currentTimeInt >= 700 && currentTimeInt <= 900) scanType = "Morning In";
      else if (currentTimeInt >= 1100 && currentTimeInt <= 1300) scanType = "Morning Out";
      else if (currentTimeInt >= 1301 && currentTimeInt <= 1430) scanType = "Afternoon In";
      else if (currentTimeInt >= 1600 && currentTimeInt <= 1859) scanType = "Afternoon Out";
    }

    // Save attendance log
    const newLog = new AttendanceLog({
      studentId: student.studentId,
      rfidUid: cleanUid,
      studentName: student.name,
      action: 'Scan',
      status: 'Present',
      session: scanType,
      eventName: finalEventName,
      timestamp: now
    });
    await newLog.save();

    // Real‑time socket update
    if (io) {
      io.emit('new-attendance', {
        studentName: student.name,
        session: scanType,
        rfidUid: cleanUid,
        timestamp: now,
        eventName: finalEventName
      });
    }

    console.log(`✅ SUCCESS: ${student.name} marked as ${scanType} for ${finalEventName}`);
    return res.status(200).json({ success: true, message: `Logged ${scanType}`, name: student.name, event: finalEventName });
  } catch (error) {
    console.error('❌ INTERNAL ERROR:', error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------- Event Archiving & Auto‑Fine ----------
const archiveEvent = async (settings) => {
  if (!settings || !settings.activeEvent) return;
  console.log(`📦 Archiving Event: ${settings.activeEvent}`);
  try {
    const attendees = await AttendanceLog.find({ eventName: settings.activeEvent });
    const query = { organization: settings.selectedOrg };
    if (settings.selectedSubOrg) query.subOrganization = settings.selectedSubOrg;
    const studentsInScope = await Student.find(query);
    const windowsByCode = {
      AM_IN: { label: 'Morning In', fineAmount: Number(settings.fineAMIn || 0) },
      AM_OUT: { label: 'Morning Out', fineAmount: Number(settings.fineAMOut || 0) },
      PM_IN: { label: 'Afternoon In', fineAmount: Number(settings.finePMIn || 0) },
      PM_OUT: { label: 'Afternoon Out', fineAmount: Number(settings.finePMOut || 0) }
    };
    const absenteeRecords = [];
    Object.values(windowsByCode).forEach(window => {
      const attendedUids = attendees
        .filter(a => a.session === window.label && a.status !== 'Absent')
        .map(a => a.rfidUid ? a.rfidUid.toString().replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase() : "");

      studentsInScope
        .filter(s => {
          const cleanStudentUid = s.rfidUid ? s.rfidUid.toString().replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase() : "";
          return !attendedUids.includes(cleanStudentUid);
        })
        .forEach(s => {
          absenteeRecords.push({
            studentId: s.studentId,
            name: s.name,
            missedSession: window.label,
            fineAmount: window.fineAmount,
            rfidUid: s.rfidUid
          });
        });
    });
    // Create fine records for each absentee
    for (const rec of absenteeRecords) {
      const student = await Student.findOne({ studentId: rec.studentId });
      if (student) {
        await addFineRecord(
          student,
          settings.activeEvent,
          rec.fineAmount,
          settings.selectedOrg,
          settings.selectedSubOrg || '',
          'Auto‑generated fine for missed attendance',
          rec.missedSession
        );
      }
    }
    // Persist event history
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
      absentees: absenteeRecords.map(r => ({
        studentId: r.studentId,
        name: r.name,
        missedSession: r.missedSession,
        fineAmount: r.fineAmount
      })),
      totalFines: absenteeRecords.reduce((sum, r) => sum + r.fineAmount, 0),
      isFinished: true
    });
    await historyRecord.save();
    console.log('✅ Event archived and fines generated.');
  } catch (err) {
    console.error('❌ Archiving Error:', err);
  }
};

module.exports = {
  Event,
  Student,
  AttendanceLog,
  handleScan,
  addFineRecord,
  archiveEvent
};
