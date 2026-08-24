const mongoose = require('mongoose');

async function checkPresentLogs() {
  await mongoose.connect('mongodb://127.0.0.1:27017/clearanceDB');
  const logSchema = new mongoose.Schema({}, { strict: false });
  const AttendanceLog = mongoose.model('AttendanceLog', logSchema, 'attendancelogs');

  const logs = await AttendanceLog.find({ status: { $ne: 'Absent' } }).sort({ timestamp: -1 });
  console.log(`Found ${logs.length} present/success logs in database (last 20):`);
  logs.slice(0, 20).forEach(l => {
    console.log(`- Student: ${l.studentName}, Event: ${l.eventName}, Session: ${l.session}, Status: ${l.status}, Time: ${l.timestamp}`);
  });

  await mongoose.disconnect();
}

checkPresentLogs();
