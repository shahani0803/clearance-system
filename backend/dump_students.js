const mongoose = require('mongoose');

async function checkStudents() {
  await mongoose.connect('mongodb://127.0.0.1:27017/clearanceDB');
  const studentSchema = new mongoose.Schema({}, { strict: false });
  const Student = mongoose.model('Student', studentSchema, 'students');

  const students = await Student.find();
  console.log(JSON.stringify(students, null, 2));

  await mongoose.disconnect();
}

checkStudents();
