const mongoose = require('mongoose');

async function checkStudents() {
  await mongoose.connect('mongodb://127.0.0.1:27017/clearanceDB');
  const studentSchema = new mongoose.Schema({}, { strict: false });
  const Student = mongoose.model('Student', studentSchema, 'students');

  const students = await Student.find();
  console.log('Students in database:');
  students.forEach(s => {
    const uid = s.rfidUid || "";
    const hex = Buffer.from(uid).toString('hex');
    console.log(`- Name: ${s.name}, RFID: [${uid}], Hex: ${hex}`);
  });

  await mongoose.disconnect();
}

checkStudents();
