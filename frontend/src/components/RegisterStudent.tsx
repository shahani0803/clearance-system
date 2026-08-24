import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io(`http://${window.location.hostname}:5001`);

const RegisterStudent = () => {
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    rfidUid: '', // Dito papasok ang na-scan
    organization: 'CCS',
    subOrganization: ''
  });

  useEffect(() => {
    // MAKINIG SA UNREGISTERED SCAN
    socket.on('unregistered-scan', (data) => {
      console.log("New Card Detected!", data.rfidUid);
      // Automatic na ilalagay ang UID sa input field!
      setFormData(prev => ({ ...prev, rfidUid: data.rfidUid }));
      alert("New RFID Detected and Filled!");
    });

    return () => { socket.off('unregistered-scan'); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Dito mo tatawagin ang API mo para i-save sa MongoDB
    const response = await fetch(`http://${window.location.hostname}:5001/api/students/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if(response.ok) alert("Student Registered Successfully!");
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold">Register New Student</h2>
      <input 
        placeholder="Full Name" 
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        className="w-full p-2 border rounded"
      />
      <div className="flex gap-2">
        <input 
          placeholder="RFID UID" 
          value={formData.rfidUid} // Ito ang mapupuno via ESP32 scan
          readOnly 
          className="w-full p-2 border rounded bg-gray-50 font-mono text-blue-600"
        />
        <span className="text-[10px] text-gray-400 italic">Scan card on ESP32 to fill</span>
      </div>
      <select 
        className="w-full p-2 border rounded"
        value={formData.organization}
        onChange={(e) => setFormData({...formData, organization: e.target.value})}
      >
        <option value="CCS">CCS (Computer Studies)</option>
        <option value="ESO">ESO (Engineering)</option>
        <option value="NABA">NABA (Business)</option>
      </select>

      <select 
        className="w-full p-2 border rounded"
        value={formData.subOrganization}
        onChange={(e) => setFormData({...formData, subOrganization: e.target.value})}
      >
        <option value="">No Sub-Org</option>
        {formData.organization === 'CCS' && (
          <>
            <option value="CCSO">CCSO</option>
            <option value="PSITS">PSITS</option>
          </>
        )}
        {formData.organization === 'ESO' && (
          <>
            <option value="ICEPEP">ICEPEP</option>
            <option value="JIECEP">JIECEP</option>
            <option value="PICE">PICE</option>
          </>
        )}
        {formData.organization === 'NABA' && (
          <>
            <option value="TEACHWISE">TEACHWISE</option>
            <option value="DTO">DTO</option>
            <option value="FSMO">FSMO</option>
            <option value="ELX">ELX</option>
            <option value="KATAHUM">KATAHUM</option>
          </>
        )}
      </select>

      <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] tracking-widest hover:bg-blue-600 transition-all shadow-xl">
        SAVE STUDENT
      </button>
    </form>
  );
};