import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import ClearanceView from './components/ClearanceView';
import EventHistory from './components/EventHistory';
import StudentDashboard from './components/StudentDashboard';
import BlockchainVerification from './components/BlockchainVerification';
import FinesCollections from './components/FinesCollections';
import { Student, AttendanceLog, ViewType } from './Types';
import { api } from './api';

const socket = io(`http://${window.location.hostname}:5001`, {
  transports: ['websocket', 'polling'],
  withCredentials: true
});

const App: React.FC = () => {
  // --- 1. STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'admin' | 'student' | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scannedRfid, setScannedRfid] = useState<string>("");

  // --- 2. DATA FETCHING FUNCTION ---
  const fetchData = async () => {
    try {
      const [sData, lData] = await Promise.all([
        api.getStudents(),
        api.getLogs()
      ]);
      setStudents(sData);
      setLogs(lData);

      // I-update ang current student data kung student ang naka-login
      const savedStudentId = localStorage.getItem('studentId');
      if (savedStudentId) {
        const found = sData.find(s => s.studentId === savedStudentId);
        if (found) setCurrentStudent(found);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  // --- 3. MAIN APP INITIALIZATION & SOCKETS ---
  useEffect(() => {
    const initApp = async () => {
      try {
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const savedRole = localStorage.getItem('userRole') as 'admin' | 'student';
        const savedStudentId = localStorage.getItem('studentId');

        const [sData, lData] = await Promise.all([
          api.getStudents(),
          api.getLogs()
        ]);
        setStudents(sData);
        setLogs(lData);

        if (loggedIn) {
          setIsAuthenticated(true);
          setUserRole(savedRole);
          if (savedRole === 'student' && savedStudentId) {
            const found = sData.find(s => s.studentId === savedStudentId);
            if (found) setCurrentStudent(found);
          }
        }
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();

    // --- SOCKET.IO LISTENERS ---
    socket.on('connect', () => console.log("🟢 Connected to Socket Server!"));

    socket.on('new-attendance', (newLog) => {
      setLogs(prev => [newLog, ...prev]);
      fetchData();
    });

    socket.on('unregistered-scan', (data) => {
      setScannedRfid(data.rfidUid);
      setCurrentView('students');
      alert(`New Card Detected: ${data.rfidUid}. Maari mo na itong irehistro.`);
    });

    socket.on('rfid-scanned', (uid) => {
      setScannedRfid(uid);
    });

    socket.on('student-updated', (updatedStudent: Student) => {
      setStudents(prev => prev.map(s => s.studentId === updatedStudent.studentId ? updatedStudent : s));

      // Kung ito ang current student, i-update rin ang profile viewer nya
      setCurrentStudent(prev => {
        if (prev?.studentId === updatedStudent.studentId) return updatedStudent;
        return prev;
      });
    });

    // Fine approved → refresh both ClearanceView and FinesCollections in real-time
    socket.on('fine-updated', () => {
      fetchData();
    });

    return () => {
      socket.off('new-attendance');
      socket.off('unregistered-scan');
      socket.off('rfid-scanned');
      socket.off('student-updated');
      socket.off('fine-updated');
    };
  }, []);

  // --- 4. AUTH HANDLERS ---
  const handleLogin = (role: 'admin' | 'student', student?: Student) => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', role);
    setIsAuthenticated(true);
    setUserRole(role);
    if (role === 'student' && student) {
      setCurrentStudent(student);
      localStorage.setItem('studentId', student.studentId);
    }
    fetchData();
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentStudent(null);
  };

  // --- 5. ACTION HANDLERS ---
  const handleUpdateStudentProfile = async (studentId: string, updatedData: Partial<Student>) => {
    try {
      const res = await api.updateStudent(studentId, updatedData);
      if (res) {
        await fetchData();
        console.log("Admin Dashboard synced with new student info.");
      }
    } catch (error) {
      console.error("Sync error:", error);
    }
  };

  const handleAddStudent = async (data: any) => {
    const res = await api.addStudent(data);
    if (res) {
      setScannedRfid("");
      fetchData();
    }
  };

  const handleUpdateClearance = async (id: string, status: Record<string, boolean>) => {
    await api.updateClearance(id, status);
    fetchData();
  };

  const totalCollections = students.reduce((total, student) => {
    const settledAmount = (student.finesActive || [])
      .filter(fine => fine.status === 'approved' || fine.status === 'collected')
      .reduce((sum, fine) => sum + fine.amount, 0);
    return total + settledAmount;
  }, 0);

  const totalUncollected = students.reduce((total, student) => {
    const activeAmount = (student.finesActive || [])
      .filter(fine => fine.status === 'active' || fine.status === 'pending')
      .reduce((sum, fine) => sum + fine.amount, 0);
    return total + activeAmount;
  }, 0);

  // --- 6. VIEW ROUTER ---
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard students={students} logs={logs} onRefresh={fetchData} />;
      case 'students':
        return (
          <StudentList
            students={students}
            onAdd={handleAddStudent}
            lastScannedRfid={scannedRfid}
            onClearRfid={() => setScannedRfid("")}
            logs={logs}
          />
        );
      case 'clearance':
        return <ClearanceView students={students} onUpdateStatus={handleUpdateClearance} onRefresh={fetchData} />;
      case 'collections':
        return (
          <FinesCollections
            students={students}
            onNavigateToClearance={() => setCurrentView('clearance')}
          />
        );
      case 'history':
        return <EventHistory />;
      case 'blockchain':
        return <BlockchainVerification />;
      default:
        return <div className="p-10 text-slate-400">View not found</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} students={students} />;
  }

  // --- STUDENT ROLE VIEW ---
  if (userRole === 'student') {
    return currentStudent ? (
      <StudentDashboard
        student={currentStudent}
        onLogout={handleLogout}
        onUpdateProfile={handleUpdateStudentProfile} // Pinasa ang sync function dito
        logs={logs}
      />
    ) : (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Student Record Not Found</h3>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            We couldn't find a student record for ID <strong className="text-slate-700">"{localStorage.getItem('studentId') || 'unknown'}"</strong> in the database.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-95"
          >
            Go Back to Login
          </button>
        </div>
      </div>
    );
  }

  // --- ADMIN ROLE VIEW ---
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <Sidebar
        activeTab={currentView}
        setActiveTab={setCurrentView}
        onLogout={handleLogout}
        students={students}
      />
      <main className="flex-1 ml-64 h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;