import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceLog } from '../Types';

interface StudentListProps {
  students: Student[];
  onAdd: (student: Omit<Student, 'id' | 'clearanceStatus'>) => void;
  lastScannedRfid: string; 
  onClearRfid: () => void;
  logs?: AttendanceLog[];
}

const StudentList: React.FC<StudentListProps> = ({ students = [], onAdd, lastScannedRfid, onClearRfid, logs = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // NEW STATES FOR VIEWING
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:5001/api/settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const activeEventName = settings?.activeEvent || (logs && logs.length > 0 ? logs[0].eventName : "No Event");
  const activeEventDate = settings?.eventDate || (logs && logs.length > 0 && logs[0].timestamp ? new Date(logs[0].timestamp).toISOString().split('T')[0] : "");
  const eventMode = settings?.eventMode || "WHOLE";

  const safeStudents = Array.isArray(students) ? students : [];

  // SYNC MODAL DATA IN REAL-TIME
  useEffect(() => {
    if (isViewOpen && selectedStudent) {
      const current = safeStudents.find(s => s.studentId === selectedStudent.studentId);
      if (current) setSelectedStudent(current);
    }
  }, [safeStudents, isViewOpen, selectedStudent]);

  // AUTO-OPEN REGISTRATION MODAL ON NEW SCAN
  useEffect(() => {
    if (lastScannedRfid) {
      setIsModalOpen(true);
    }
  }, [lastScannedRfid]);

  // Aggregate logs for the selected student
  const studentLogs = useMemo(() => {
    if (!selectedStudent) return [];
    const map = new Map<string, any>();

    logs.filter(log => log.rfidUid === selectedStudent.rfidUid).forEach(log => {
      if (!log.timestamp) return;
      const date = new Date(log.timestamp).toLocaleDateString('en-PH');
      const eventName = log.eventName || "General Event";
      const key = `${date}_${eventName}`;

      if (!map.has(key)) {
        map.set(key, { eventName, date, amIn: 'Missed', amOut: 'Missed', pmIn: 'Missed', pmOut: 'Missed' });
      }

      const entry = map.get(key)!;
      const timeString = new Date(log.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
      const scanAction = log.session || log.action;
      const value = log.status === 'Absent' ? 'Absent' : timeString;

      if (scanAction?.toLowerCase().includes('morning in') || scanAction?.toLowerCase().includes('am in')) {
        entry.amIn = value;
      } else if (scanAction?.toLowerCase().includes('morning out') || scanAction?.toLowerCase().includes('am out')) {
        entry.amOut = value;
      } else if (scanAction?.toLowerCase().includes('afternoon in') || scanAction?.toLowerCase().includes('pm in')) {
        entry.pmIn = value;
      } else if (scanAction?.toLowerCase().includes('afternoon out') || scanAction?.toLowerCase().includes('pm out')) {
        entry.pmOut = value;
      } else {
        if (entry.amIn === 'Missed') entry.amIn = value;
      }
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, selectedStudent]);

  const [formData, setFormData] = useState({
    studentId: '', name: '', course: 'BSCS', year: 1, rfidUid: '',
    organization: 'CCS' as 'CCS' | 'ESO' | 'NABA',
    subOrganization: '',
    sboFine: 0, esoFine: 0, icepepFine: 0, ccsoFine: 0, psitsFine: 0,
    teachwiseFine: 0, dtoFine: 0, fsmoFine: 0, elxFine: 0, katahumFine: 0
  });

  const subOrgOptions: Record<string, string[]> = {
    CCS: ['CCSO', 'PSITS'],
    ESO: ['ICEPEP', 'JIECEP', 'PICE'],
    NABA: ['TEACHWISE', 'DTO', 'FSMO', 'ELX', 'KATAHUM']
  };

  const filteredStudents = safeStudents.filter(s => 
    (s.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (s.studentId || "").includes(searchTerm)
  );

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsViewOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* HEADER ACTIONS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search name or student ID..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
        >
          <span>Register New Student</span>
          <span className="text-lg">+</span>
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/80 backdrop-blur-sm">
            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <th className="px-4 py-3">Student Information</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3 text-center">Fines Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-30">
                    <span className="text-4xl">👥</span>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">No students found</p>
                  </div>
                </td>
              </tr>
            ) : filteredStudents.map((student) => {
              const sessionLabels: Record<string, string> = {
                'Morning In': 'AM In',
                'Morning Out': 'AM Out',
                'Afternoon In': 'PM In',
                'Afternoon Out': 'PM Out'
              };

              const requiredSessions = eventMode === 'MORNING' 
                ? ['Morning In', 'Morning Out'] 
                : eventMode === 'AFTERNOON' 
                ? ['Afternoon In', 'Afternoon Out'] 
                : ['Morning In', 'Morning Out', 'Afternoon In', 'Afternoon Out'];

              const studentLogsForEvent = logs.filter(log => 
                log.eventName === activeEventName && 
                (log.rfidUid === student.rfidUid || log.studentId === student.studentId) &&
                log.status !== 'Absent'
              );

              const inScope = !settings || !settings.isEventSaved || (
                student.organization === settings.selectedOrg &&
                (!settings.selectedSubOrg || student.subOrganization === settings.selectedSubOrg)
              );

              const missedSessions: string[] = [];
              let presentCount = 0;
              let missedCount = 0;

              if (inScope && activeEventName && activeEventName !== "No Event") {
                requiredSessions.forEach(session => {
                  const attended = studentLogsForEvent.some(log => {
                    const sess = log.session || log.action || '';
                    return sess.toLowerCase().includes(session.toLowerCase());
                  });
                  if (attended) {
                    presentCount++;
                  } else {
                    missedCount++;
                    missedSessions.push(sessionLabels[session] || session);
                  }
                });
              }

              const unpaidCount = (student.finesActive || []).filter(
                f => f.status === 'active' || f.status === 'pending'
              ).length;
              const paidCount = (student.finesActive || []).filter(
                f => f.status === 'approved' || f.status === 'collected'
              ).length;

              return (
              <tr key={student.studentId} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-xs overflow-hidden shrink-0">
                      {student.profilePic ? (
                        <img src={student.profilePic} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        "👤"
                      )}
                    </div>
                    {/* CLICKABLE NAME */}
                    <button 
                      onClick={() => handleViewStudent(student)}
                      className="text-left"
                    >
                      <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-xs">
                        {student.name}
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono tracking-wide">{student.studentId}</p>
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-100 text-slate-600 uppercase tracking-widest">
                    {student.organization}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className="text-[9px] font-bold text-slate-500">
                      {paidCount} Paid · {unpaidCount} Unpaid
                    </span>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* --- VIEW PROFILE MODAL --- */}
      {isViewOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-10000 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
            
            {/* Modal Header with Profile Image */}
            <div className="relative pt-16 pb-10 bg-linear-to-br from-indigo-900 via-indigo-800 to-violet-900 p-6 flex flex-col items-center justify-center text-center">
              <div className="absolute top-4 right-4 flex items-center gap-2 no-print">
                <button 
                  onClick={() => { setIsViewOpen(false); setShowHistory(false); }}
                  className="bg-white/20 hover:bg-rose-500 text-white px-3 py-1.5 rounded-full transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  Close
                </button>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <div className="h-24 w-24 rounded-4xl bg-white shadow-2xl flex items-center justify-center text-3xl overflow-hidden border-4 border-white/30">
                  {selectedStudent.profilePic ? (
                    <img src={selectedStudent.profilePic} alt={selectedStudent.name} className="w-full h-full object-cover" />
                  ) : "👤"}
                </div>
                <div className="text-white">
                  <h3 className="text-3xl font-black tracking-tight mb-1 drop-shadow-sm">{selectedStudent.name}</h3>
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 backdrop-blur-md">
                      {selectedStudent.course}
                    </span>
                    <span className="text-[10px] font-black bg-indigo-500/30 px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 backdrop-blur-md">
                      {selectedStudent.year === 1 ? '1st' : selectedStudent.year === 2 ? '2nd' : selectedStudent.year === 3 ? '3rd' : '4th'} Year
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50/30 rounded-3xl border border-indigo-100/50">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Affiliation</p>
                  <p className="text-xs font-black text-indigo-900 uppercase">{selectedStudent.organization} Official Member</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between col-span-1">
                   <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">RFID UID</p>
                    <p className="font-mono text-xs text-indigo-600 font-bold">{selectedStudent.rfidUid}</p>
                   </div>
                   <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                   >
                     {showHistory ? 'Hide Logs' : 'View Logs'}
                     <span className={`transition-transform ${showHistory ? 'rotate-180' : ''}`}>▼</span>
                   </button>
                </div>
              </div>

                {showHistory && (
                <div className="md:col-span-2 animate-in fade-in slide-in-from-top-4 duration-500 no-print">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Event Attendance History</p>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase">Event</th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase">Date</th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase text-center">AM In</th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase text-center">AM Out</th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase text-center">PM In</th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase text-center">PM Out</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentLogs.length === 0 ? (
                          <tr><td colSpan={6} className="p-6 text-center text-xs text-slate-400">No records found.</td></tr>
                        ) : studentLogs.map((log, idx) => {
                          const getColor = (t: string) => t === 'Missed' ? 'text-red-500 font-bold bg-red-50 px-1 py-0.5 rounded text-[9px]' : 'text-emerald-600 font-medium text-[9px]';
                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 text-[11px] font-bold text-slate-700">{log.eventName}</td>
                              <td className="p-3 text-[11px] text-slate-500">{log.date}</td>
                              <td className="p-3 text-center"><span className={getColor(log.amIn)}>{log.amIn}</span></td>
                              <td className="p-3 text-center"><span className={getColor(log.amOut)}>{log.amOut}</span></td>
                              <td className="p-3 text-center"><span className={getColor(log.pmIn)}>{log.pmIn}</span></td>
                              <td className="p-3 text-center"><span className={getColor(log.pmOut)}>{log.pmOut}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}

              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-widest hover:bg-blue-600 transition-all shadow-xl"
                >
                  PRINT CLEARANCE SLIP
                </button>
                <button 
                  onClick={() => setIsViewOpen(false)}
                  className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                >
                  CLOSE
                </button>
              </div>

            </div>
          </div>
      )}

      {/* --- REGISTRATION MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-10000 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-linear-to-br from-slate-900 to-slate-800 text-white relative">
               <h3 className="text-2xl font-black tracking-tighter">REGISTER STUDENT</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Add new member to the system</p>
               <button onClick={() => { setIsModalOpen(false); onClearRfid(); }} className="absolute top-8 right-8 text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            
            <div className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Full Name</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Student ID</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold ring-1 ring-slate-100 outline-none" 
                    placeholder="2024-0001"
                    value={formData.studentId}
                    onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">RFID UID</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      className="w-full p-4 bg-blue-50 border-none rounded-2xl text-xs font-mono font-bold text-blue-600 ring-1 ring-blue-100 outline-none" 
                      placeholder="SCAN CARD..."
                      value={lastScannedRfid || formData.rfidUid}
                      readOnly
                    />
                    {lastScannedRfid && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-500">READY</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Organization</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold ring-1 ring-slate-100 outline-none cursor-pointer"
                    value={formData.organization}
                    onChange={(e) => setFormData({...formData, organization: e.target.value as any, subOrganization: ''})}
                  >
                    <option value="CCS">CCS</option>
                    <option value="ESO">ESO</option>
                    <option value="NABA">NABA</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Department / Sub-Org</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold ring-1 ring-slate-100 outline-none cursor-pointer"
                    value={formData.subOrganization}
                    onChange={(e) => setFormData({...formData, subOrganization: e.target.value})}
                  >
                    <option value="">None</option>
                    {subOrgOptions[formData.organization]?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Course</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold ring-1 ring-slate-100 outline-none" 
                    placeholder="e.g. BSCS"
                    value={formData.course}
                    onChange={(e) => setFormData({...formData, course: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Year Level</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold ring-1 ring-slate-100 outline-none cursor-pointer"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: Number(e.target.value)})}
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={() => {
                  onAdd({ 
                    ...formData, 
                    rfidUid: lastScannedRfid || formData.rfidUid,
                    fines: { total: 0, isPaid: true } 
                  });
                  setIsModalOpen(false);
                  setFormData({
                    studentId: '', name: '', course: 'BSCS', year: 1, rfidUid: '',
                    organization: 'CCS',
                    subOrganization: '',
                    sboFine: 0, esoFine: 0, icepepFine: 0, ccsoFine: 0, psitsFine: 0,
                    teachwiseFine: 0, dtoFine: 0, fsmoFine: 0, elxFine: 0, katahumFine: 0
                  });
                }}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all mt-4"
              >
                Complete Registration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;
