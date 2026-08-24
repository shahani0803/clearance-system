import express from "express";
import { Student } from "../models/student.js";

const router = express.Router();

// [GET] Dashboard Stats
router.get("/stats", async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const cleared = await Student.countDocuments({ "fines.total": 0 }); 
    const withFines = await Student.countDocuments({ "fines.total": { $gt: 0 } });

    const students = await Student.find();
    
    const totalCollected = students
      .filter(s => s.fines.isPaid)
      .reduce((sum, s) => sum + (s.fines.total || 0), 0);

    const totalUnpaid = students
      .filter(s => !s.fines.isPaid)
      .reduce((sum, s) => sum + (s.fines.total || 0), 0);

    res.json({
      totalStudents,
      cleared,
      withFines,
      totalCollected,
      totalUnpaid
    });

  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;