const mongoose = require('mongoose');

async function checkStudents() {
  await mongoose.connect('mongodb://127.0.0.1:27017/clearanceDB');
  const studentSchema = new mongoose.Schema({}, { strict: false });
  const Student = mongoose.model('Student', studentSchema, 'students');

  const students = await Student.find();
  console.log('Students in database:');
  students.forEach(s => {
    console.log(`- Name: ${s.name}, RFID: [${s.rfidUid}], ID: ${s.studentId}`);
  });

  await mongoose.disconnect();
}

checkStudents();
