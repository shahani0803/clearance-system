const express = require('express');
const router = express.Router();
const { Student } = require('../models/student');

// Record fine for absent students (called after event finishes)
router.post('/apply', async (req, res) => {
  try {
    const { eventName, organization, subOrganization, fineAmount, absentStudentIds } = req.body;

    if (!eventName || !organization || !fineAmount || !absentStudentIds) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const updatedStudents = [];
    for (const studentId of absentStudentIds) {
      const student = await Student.findOneAndUpdate(
        { studentId },
        {
          $push: {
            finesActive: {
              eventName,
              organization,
              subOrganization: subOrganization || '',
              amount: fineAmount,
              status: 'active',
              dateIssued: new Date(),
            }
          },
          $inc: { totalUncollectedFines: fineAmount }
        },
        { new: true }
      );
      if (student) updatedStudents.push(student);
    }

    res.json({ success: true, updatedCount: updatedStudents.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student's active + pending fines
router.get('/student/:studentId', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const uncollected = student.finesActive.filter(f =>
      f.status === 'active' || f.status === 'pending'
    );
    const collected = student.finesActive.filter(f =>
      f.status === 'approved' || f.status === 'collected'
    );

    res.json({
      uncollected,
      collected,
      totalUncollected: student.totalUncollectedFines,
      totalCollected: student.totalCollectedFines
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student marks fine as paid (status: active → pending)
router.put('/:studentId/:fineIndex/mark-paid', async (req, res) => {
  try {
    const { studentId, fineIndex } = req.params;
    const student = await Student.findOne({ studentId });

    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!student.finesActive[fineIndex]) return res.status(404).json({ error: 'Fine not found' });

    student.finesActive[fineIndex].status = 'pending';
    student.finesActive[fineIndex].studentMarkedPaidAt = new Date();
    await student.save();

    res.json({ success: true, fine: student.finesActive[fineIndex] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin approves payment (status: pending → approved, move to collections)
router.put('/:studentId/:fineIndex/approve-payment', async (req, res) => {
  try {
    const { studentId, fineIndex } = req.params;
    const student = await Student.findOne({ studentId });

    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!student.finesActive[fineIndex]) return res.status(404).json({ error: 'Fine not found' });

    const fine = student.finesActive[fineIndex];
    fine.status = 'collected';
    fine.adminApprovedAt = new Date();

    student.totalCollectedFines += fine.amount;
    student.totalUncollectedFines -= fine.amount;

    await student.save();

    res.json({ success: true, fine });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all collected fines (for admin collections page)
router.get('/collections', async (req, res) => {
  try {
    const students = await Student.find({});
    const collected = [];

    students.forEach(student => {
      student.finesActive.forEach(fine => {
        if (fine.status === 'collected') {
          collected.push({
            _id: `${student._id}-${fine.dateIssued}`,
            studentId: student.studentId,
            studentName: student.name,
            eventName: fine.eventName,
            organization: fine.organization,
            subOrganization: fine.subOrganization,
            amount: fine.amount,
            status: 'collected',
            dateIssued: fine.dateIssued,
            adminApprovedAt: fine.adminApprovedAt,
            studentMarkedPaidAt: fine.studentMarkedPaidAt
          });
        }
      });
    });

    const totalAmount = collected.reduce((sum, f) => sum + f.amount, 0);

    res.json({
      collected: collected.sort((a, b) =>
        new Date(b.adminApprovedAt) - new Date(a.adminApprovedAt)
      ),
      totalAmount,
      totalRecords: collected.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get fines summary (for dashboard)
router.get('/summary', async (req, res) => {
  try {
    const students = await Student.find({});
    let totalCollected = 0;
    let totalUncollected = 0;
    const byOrganization = {};

    students.forEach(student => {
      const collected = student.finesActive
        .filter(f => f.status === 'collected')
        .reduce((sum, f) => sum + f.amount, 0);

      const uncollected = student.finesActive
        .filter(f => f.status === 'active' || f.status === 'pending')
        .reduce((sum, f) => sum + f.amount, 0);

      totalCollected += collected;
      totalUncollected += uncollected;

      student.finesActive.forEach(fine => {
        const org = fine.organization;
        if (!byOrganization[org]) {
          byOrganization[org] = { collected: 0, uncollected: 0 };
        }
        if (fine.status === 'collected') {
          byOrganization[org].collected += fine.amount;
        } else if (fine.status === 'active' || fine.status === 'pending') {
          byOrganization[org].uncollected += fine.amount;
        }
      });
    });

    res.json({
      totalCollected,
      totalUncollected,
      byOrganization,
      collectionRate: totalCollected + totalUncollected > 0
        ? Math.round((totalCollected / (totalCollected + totalUncollected)) * 100)
        : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin dashboard: Get all uncollected fines per organization
router.get('/uncollected/all', async (req, res) => {
  try {
    const students = await Student.find({});
    const uncollected = [];

    students.forEach(student => {
      student.finesActive.forEach(fine => {
        if (fine.status === 'active' || fine.status === 'pending') {
          uncollected.push({
            _id: `${student._id}-${fine.dateIssued}`,
            studentId: student.studentId,
            studentName: student.name,
            eventName: fine.eventName,
            organization: fine.organization,
            subOrganization: fine.subOrganization,
            amount: fine.amount,
            status: fine.status,
            dateIssued: fine.dateIssued,
            studentMarkedPaidAt: fine.studentMarkedPaidAt,
            notes: fine.notes
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

module.exports = router;
