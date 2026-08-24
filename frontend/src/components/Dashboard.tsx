import React, { useEffect, useState } from 'react';
import { Student, AttendanceLog } from '../Types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { io } from 'socket.io-client';

const socket = io(`http://${window.location.hostname}:5001`);

interface DashboardProps {
  students: Student[];
  logs: AttendanceLog[];
  onRefresh: () => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ students = [], onRefresh }) => {
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // --- CORE EVENT STATES ---
  const [activeEvent, setActiveEvent] = useState("");
  const [isEventSaved, setIsEventSaved] = useState(false);
  const [eventMode, setEventMode] = useState<'WHOLE' | 'MORNING' | 'AFTERNOON'>('WHOLE');
  const [selectedOrg, setSelectedOrg] = useState<'CCS' | 'ESO' | 'NABA'>("CCS");
  const [selectedSubOrg, setSelectedSubOrg] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

  // 4-Window Attendance Schedule
  const [mornIn, setMornIn] = useState('07:00');
  const [mornOut, setMornOut] = useState('11:30');
  const [aftIn, setAftIn] = useState('13:00');
  const [aftOut, setAftOut] = useState('16:30');

  // Detailed Fines Setup
  const [fineAMIn, setFineAMIn] = useState(25);
  const [fineAMOut, setFineAMOut] = useState(25);
  const [finePMIn, setFinePMIn] = useState(25);
  const [finePMOut, setFinePMOut] = useState(25);

  // Tracker para sa mga windows na na-process na (na-apply na ang multa)
  const [processedWindows, setProcessedWindows] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- BACKEND-MANAGED AUTO FINES ---
  // The backend now handles the auto-fine logic via a cron-like setInterval.
  // We just listen for updates and refresh the data.

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('new-attendance', (data) => {
      setLiveLogs((prev) => [{ ...data, timestamp: new Date().toISOString() }, ...prev].slice(0, 10));
    });
    socket.on('fines-updated', () => {
      console.log("Fines updated from server, refreshing data...");
      onRefresh();
    });
    return () => {
      socket.off('connect');
      socket.off('new-attendance');
      socket.off('fines-updated');
    };
  }, [onRefresh]);

  // --- DATA CALCULATIONS FOR UI ---
  const safeStudents = Array.isArray(students) ? students : [];
  const clearedCount = safeStudents.filter(s => {
    const st = s.clearanceStatus || {};
    return Object.values(st).length > 0 && Object.values(st).every(v => v === true);
  }).length;
  const totalRevenue = safeStudents.reduce((sum, s) => sum + (s.fines?.total || 0), 0);

  const chartData = [
    { name: 'Total Students', val: safeStudents.length, fill: '#3b82f6' },
    { name: 'Fully Cleared', val: clearedCount, fill: '#10b981' },
    { name: 'With Fines', val: safeStudents.filter(s => (s.fines?.total || 0) > 0).length, fill: '#ef4444' },
    { name: 'Live Scans', val: liveLogs.length, fill: '#f59e0b' },
  ];

  const handleCloseEvent = async (event) => {
    const confirmClose = window.confirm(`Sigurado ka bang i-close ang ${event.name}? Mag-a-add ito ng P${event.fineValue} sa lahat ng hindi nag-scan.`);

    if (confirmClose) {
      try {
        const response = await fetch(`http://localhost:5001/api/events/${event._id}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fineAmount: event.fineValue,
            eventName: event.name
          })
        });

        if (response.ok) {
          alert("Event closed and fines applied!");
          await onRefresh(); // I-refresh ang students list para makita ang bagong fines
        }
      } catch (error) {
        alert("Nagka-error sa pag-close ng event.");
      }
    }
  };

  // 1. Load settings pag-mount ng component
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:5001/api/settings`);
        const data = await res.json();
        if (data.activeEvent) {
          setActiveEvent(data.activeEvent);
          setEventMode(data.eventMode);
          setSelectedOrg(data.selectedOrg);
          setSelectedSubOrg(data.selectedSubOrg);
          setEventDate(data.eventDate);
          setMornIn(data.mornIn); setMornOut(data.mornOut);
          setAftIn(data.aftIn); setAftOut(data.aftOut);
          setFineAMIn(data.fineAMIn); setFineAMOut(data.fineAMOut);
          setFinePMIn(data.finePMIn); setFinePMOut(data.finePMOut);
          setIsEventSaved(data.isEventSaved);
          setProcessedWindows(data.processedWindows || []);
        }
      } catch (err) { console.error("Load settings failed", err); }
    };
    loadSettings();
  }, []);

  // 2. I-update ang Save Button Handler
  const toggleMonitoring = async () => {
    const newState = !isEventSaved;
    setIsEventSaved(newState);

    if (!newState) setProcessedWindows([]); // Reset windows pag stop

    // I-save sa database
    await fetch(`http://${window.location.hostname}:5001/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activeEvent, eventMode, selectedOrg, selectedSubOrg, eventDate,
        mornIn, mornOut, aftIn, aftOut,
        fineAMIn, fineAMOut, finePMIn, finePMOut,
        isEventSaved: newState,
        processedWindows: newState ? processedWindows : []
      })
    });
  };

  const handleResetFines = async () => {
    if (!window.confirm("⚠️ WARNING: This will PERMANENTLY erase ALL fines and fine history for ALL students. This cannot be undone. Are you sure?")) return;
    try {
      const res = await fetch(`http://${window.location.hostname}:5001/api/admin/reset-fines`, { method: 'POST' });
      if (res.ok) {
        alert("💸 All fines have been successfully reset to zero!");
        onRefresh();
      }
    } catch (err) {
      alert("❌ Error resetting fines.");
    }
  };

  return (
    <div className="space-y-6 p-4 animate-in fade-in duration-1000">
      {/* 1. HEADER & SYSTEM STATUS */}
      <header className="flex justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white text-2xl font-black italic shadow-2xl">R</div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">RFID Control</h2>
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleResetFines}
                className="text-[7px] font-black px-2 py-0.5 rounded-md border bg-white text-red-600 border-red-200 hover:bg-red-50 transition-colors"
              >
                RESET ALL FINES
              </button>
              {['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT'].map(w => (
                <span key={w} className={`text-[7px] font-black px-2 py-0.5 rounded-md border ${processedWindows.includes(w) ? 'bg-red-500 text-white border-red-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                  {w} {processedWindows.includes(w) ? 'CLOSED' : 'OPEN'}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-xl text-[9px] font-black ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {isConnected ? '● ONLINE' : '○ OFFLINE'}
          </div>
          <button
            onClick={toggleMonitoring} // Gamitin ang bagong function
            className={`px-8 py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-lg transition-all active:scale-95 ${isEventSaved ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
          >
            {isEventSaved ? 'STOP & UNLOCK' : 'SAVE & START MONITORING'}
          </button>
        </div>
      </header>

      {/* 2. FULL CONFIGURATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* EVENT META */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Event Basics</p>
          <input disabled={isEventSaved} type="text" className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Event Name" value={activeEvent} onChange={(e) => setActiveEvent(e.target.value)} />
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['WHOLE', 'MORNING', 'AFTERNOON'].map((m) => (
              <button disabled={isEventSaved} key={m} onClick={() => setEventMode(m as any)} className={`flex-1 py-2 text-[9px] font-black rounded-lg ${eventMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                {m}
              </button>
            ))}
          </div>
          <input disabled={isEventSaved} type="date" className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none ring-1 ring-slate-200" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>

        {/* ORGANIZATION SCOPE */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Scope / Org</p>
          <select disabled={isEventSaved} className="w-full p-4 bg-slate-50 rounded-2xl text-sm ring-1 ring-slate-200 outline-none" value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value as any)}>
            <option value="CCS">CCS (Computer Studies)</option>
            <option value="ESO">ESO (Engineering)</option>
            <option value="NABA">NABA (Business)</option>
          </select>
          <select disabled={isEventSaved} className="w-full p-4 bg-slate-50 rounded-2xl text-sm ring-1 ring-slate-200 outline-none" value={selectedSubOrg} onChange={(e) => setSelectedSubOrg(e.target.value)}>
            <option value="">All Sub-Orgs</option>
            {selectedOrg === 'CCS' && <><option value="CCSO">CCSO</option><option value="PSITS">PSITS</option></>}
            {selectedOrg === 'ESO' && <><option value="ICEPEP">ICEPEP</option><option value="JIECEP">JIECEP</option><option value="PICE">PICE</option><option>ESO</option></>}
            {selectedOrg === 'NABA' && (
              <>
                <option value="TEACHWISE">TEACHWISE</option>
                <option value="DTO">DTO</option>
                <option value="FSMO">FSMO</option>
                <option value="ELX">ELX</option>
                <option value="KATAHUM">KATAHUM</option>
              </>
            )}
          </select>
        </div>

        {/* TIME ATTENDANCE WINDOWS */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">3. Attendance Windows</p>
          <div className="grid grid-cols-2 gap-4">
            <div className={`space-y-3 ${eventMode === 'AFTERNOON' ? 'opacity-20' : ''}`}>
              <TimeField label="AM IN" val={mornIn} set={setMornIn} disabled={isEventSaved} color="text-blue-500" />
              <TimeField label="AM OUT" val={mornOut} set={setMornOut} disabled={isEventSaved} color="text-blue-600" />
            </div>
            <div className={`space-y-3 ${eventMode === 'MORNING' ? 'opacity-20' : ''}`}>
              <TimeField label="PM IN" val={aftIn} set={setAftIn} disabled={isEventSaved} color="text-orange-500" />
              <TimeField label="PM OUT" val={aftOut} set={setAftOut} disabled={isEventSaved} color="text-orange-600" />
            </div>
          </div>
        </div>

        {/* DETAILED FINES */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">4. Penalty Fines</p>
          <div className="grid grid-cols-2 gap-3">
            <FineBox label="AM IN" val={fineAMIn} set={setFineAMIn} disabled={isEventSaved} />
            <FineBox label="AM OUT" val={fineAMOut} set={setFineAMOut} disabled={isEventSaved} />
            <FineBox label="PM IN" val={finePMIn} set={setFinePMIn} disabled={isEventSaved} />
            <FineBox label="PM OUT" val={finePMOut} set={setFinePMOut} disabled={isEventSaved} />
          </div>
        </div>

      </div>

      {/* 3. ANALYTICS & LIVE FEED SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ENHANCED CHART */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm h-120 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic underline decoration-blue-500 decoration-4 underline-offset-8">Data Analytics</h3>
            <div className="text-[10px] font-black text-slate-400">TOTAL REVENUE: <span className="text-blue-600 text-lg ml-2">₱{totalRevenue.toLocaleString()}</span></div>
          </div>
          <div className="flex-1 w-full pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="val" radius={[15, 15, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DARK FEED */}
        <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl flex flex-col h-120">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 italic">Live Activity Feed</h3>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2 no-scrollbar">
            {liveLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <div className="h-10 w-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black text-white uppercase">Waiting for Scans</p>
              </div>
            ) : (
              liveLogs.map((log, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center group hover:bg-white/10 transition-all">
                  <div>
                    <p className="text-xs font-black text-white">{log.studentName || 'Student Scan'}</p>
                    <p className="text-[8px] text-slate-500 font-black uppercase mt-1 tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-mono text-blue-400 font-bold uppercase">UID: {log.rfidUid?.slice(-6)}</p>
                    <p className="text-[7px] font-black text-emerald-500 uppercase mt-1">Authorized</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// --- MINI SUB-COMPONENTS FOR CLEANLINESS ---

const TimeField = ({ label, val, set, disabled, color }: any) => (
  <div className="space-y-1">
    <p className={`text-[8px] font-black uppercase ${color}`}>{label}</p>
    <input disabled={disabled} type="time" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20" value={val} onChange={(e) => set(e.target.value)} />
  </div>
);

const FineBox = ({ label, val, set, disabled }: any) => (
  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col">
    <span className="text-[7px] font-black text-slate-400 uppercase mb-1">{label}</span>
    <input disabled={disabled} type="number" className="bg-transparent font-black text-sm text-slate-800 outline-none w-full" value={val} onChange={(e) => set(Number(e.target.value))} />
  </div>
);

export default Dashboard;