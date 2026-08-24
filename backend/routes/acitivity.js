// backend/server.js or a specific route
app.post('/api/attendance/scan', async (req, res) => {
  const { rfidUid, eventName, fineAmount } = req.body;

  try {
    const student = await Student.findOne({ rfidUid });
    if (!student) return res.status(404).json({ message: "RFID not registered" });

   
    
    res.status(200).json({ studentName: student.name, status: "Success" });
  } catch (err) {
    res.status(500).json(err);
  }
});