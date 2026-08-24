import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io(`http://${window.location.hostname}:5001`);

const DashboardPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "",
    name: "",
    rfidUid: ""
  });

  useEffect(() => {

    socket.on("unregistered-scan", (data) => {
      console.log("Auto-filling UID:", data.rfidUid);
      
      setFormData(prev => ({ ...prev, rfidUid: data.rfidUid }));
      setShowModal(true); 
    });

    return () => socket.off("unregistered-scan");
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      //  database
      const response = await axios.post(`${BASE_URL}/students/add/scan`, formData);
      
      if (response.data.success) {
        alert("✅ Student Registered!");
        setShowModal(false);
        setFormData({ studentId: "", name: "", rfidUid: "" });
      }
    } catch (err) {
      alert("❌ Error saving: " + (err.response?.data?.message || "Check fields"));
    }
  };

  return (
    <div>
      {/* Dashboard Stats UI dito */}
      
      {showModal && (
        <div className="registration-modal">
           <form onSubmit={handleRegister}>
              <h2>New Student Found!</h2>
              <label>RFID UID:</label>
              <input type="text" value={formData.rfidUid} readOnly />
              
              <label>Student ID:</label>
              <input 
                type="text" 
                required 
                onChange={(e) => setFormData({...formData, studentId: e.target.value})} 
              />
              
              <label>Full Name:</label>
              <input 
                type="text" 
                required 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
              
              <button type="submit">Save Student</button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
           </form>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;