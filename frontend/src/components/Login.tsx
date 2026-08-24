import React, { useState } from 'react';
import { Student } from '../Types';

interface LoginProps {
  // Updated onLogin to pass the role and optional student data
  onLogin: (role: 'admin' | 'student', student?: Student) => void;
  students: Student[];
}

const Login: React.FC<LoginProps> = ({ onLogin, students }) => {
  const [isAdminView, setIsAdminView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', 'admin');
      onLogin('admin');
    } else {
      alert('Invalid Admin Credentials');
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const foundStudent = students.find(s => s.studentId === studentId);
    if (foundStudent) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', 'student');
      // Pass the found student data back to App.tsx
      onLogin('student', foundStudent);
    } else {
      alert("Student ID not found. Please check and try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
          <img src="./LOGO.png" alt="Logo" className="w-20 h-20 mx-auto mb-4 object-contain drop-shadow-sm" />
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">CampusSync</h2>
          <p className="text-slate-500 text-sm font-medium">Clearance & Attendance System</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-2 bg-slate-100/50 m-4 rounded-xl border border-slate-200">
          <button 
            onClick={() => setIsAdminView(true)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isAdminView ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Admin
          </button>
          <button 
            onClick={() => setIsAdminView(false)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isAdminView ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Student
          </button>
        </div>

        <div className="p-8 pt-2">
          {isAdminView ? (
            /* ADMIN FORM */
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Username</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                <input 
                  type="password" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-[0.98]">
                Access Admin Portal
              </button>
            </form>
          ) : (
            /* STUDENT FORM */
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6">
                <p className="text-blue-700 text-xs leading-relaxed">
                  <strong>Notice:</strong> Students only need their <strong>Student ID Number</strong> to check their clearance status and pending fines.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Student ID Number</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. 2021-10432"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all active:scale-[0.98]">
                Check My Status
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;