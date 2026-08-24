

/**
 * MERN BACKEND SETUP (Node.js + Express + Mongoose)
 * This file is for your reference in VS Code.
 */
import express from 'express';
import mongoose, { Schema, Document } from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// --- Database Schema ---

interface IStudent extends Document {
  studentId: string;
  name: string;
  course: string;
  year: number;
  rfidUid: string;
  fines: number;
  clearanceStatus: {
    registrar: boolean;
    library: boolean;
    accounting: boolean;
    laboratory: boolean;
    dean: boolean;
  };
}
const Fine = require("./fine");

const StudentSchema: Schema = new Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  course: String,
  year: Number,
  rfidUid: { type: String, required: true, unique: true },
  fines: { type: Number, default: 0 },
  clearanceStatus: {
    registrar: { type: Boolean, default: false },
    library: { type: Boolean, default: false },
    accounting: { type: Boolean, default: false },
    laboratory: { type: Boolean, default: false },
    dean: { type: Boolean, default: false }
  }
});

const LogSchema: Schema = new Schema({
  studentId: String,
  name: String,
  rfidUid: String,
  timestamp: { type: Date, default: Date.now },
  event: String
});

const Student = mongoose.model<IStudent>('Student', StudentSchema);
const Log = mongoose.model('Log', LogSchema);

// --- API Routes (The 'C' in MERN) ---

/**
 * @route   POST /api/scan
 * @desc    Receive RFID UID from ESP32, verify and log
 */
// Fix: Removed explicit Request/Response types to avoid name collision with global types and allow correct Express inference
app.post('/api/scan', async (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out' });
  const { rfidUid } = req.body;
  try {
    const student = await Student.findOne({ rfidUid });
    if (!student) {
      return res.status(404).json({ success: false, message: "Unregistered RFID" });
    }

    const newLog = new Log({
      studentId: student.studentId,
      name: student.name,
      rfidUid: student.rfidUid,
      event: 'Scanner-01 Check-in'
    });

    await newLog.save();
    return res.status(200).json({
      success: true,
      studentName: student.name,
      clearanceProgress: Object.values(student.clearanceStatus).filter(Boolean).length
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   GET /api/students
 * @desc    Fetch all student records
 */
app.get('/api/students', async (_req, res) => {
  const students = await Student.find().sort({ name: 1 });
  res.json(students);
});

/**
 * @route   PUT /api/clearance/:id
 * @desc    Update clearance status for a department
 */
app.put('/api/clearance/:id', async (req, res) => {
  const { clearanceStatus } = req.body;
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { clearanceStatus },
      { new: true }
    );
    res.json(student);
  } catch (err) {
    res.status(400).json({ message: "Update failed" });
  }
});

// --- Server Connection ---

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campus_db';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('--- MongoDB Connected ---');
    app.listen(PORT, () => console.log(`--- Server Running on Port {PORT} ---`));
  })
  .catch(err => console.error('Connection Error:', err));
