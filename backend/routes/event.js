// backend/routes/event.js
app.post('/api/events/apply-fines', async (req, res) => {
  const { eventName, organization, fineAmount } = req.body;

  try {
  
    const studentsInOrg = await Student.find({ organization });

    
    const attendees = await Log.find({ event: eventName }).distinct('rfidUid');

   
    const absentees = studentsInOrg.filter(s => !attendees.includes(s.rfidUid));

    // 4. Update fines for absentees
    for (let student of absentees) {
      student.fines.total += fineAmount;
      student.fines.isPaid = false;
      await student.save();
    }

    res.json({ success: true, penalisedCount: absentees.length });
  } catch (err) {
    res.status(500).send(err.message);
  }
});