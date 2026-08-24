import express from "express";
import Student from "../models/Student.js";

const router = express.Router();

router.get("/stats", async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const cleared = await Student.countDocuments({ status: "cleared" });
    const withFines = await Student.countDocuments({ status: "with_fines" });

    const paidStudents = await Student.find({ paid: true });
    const unpaidStudents = await Student.find({ paid: false });

    const totalCollected = paidStudents.reduce((sum, s) => sum + s.fineAmount, 0);
    const totalUnpaid = unpaidStudents.reduce((sum, s) => sum + s.fineAmount, 0);

    res.json({
      totalStudents,
      cleared,
      withFines,
      totalCollected,
      totalUnpaid
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;