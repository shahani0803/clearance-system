import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Student, AttendanceLog, getClearanceSteps } from '../Types';
import MyReceipts from './MyReceipts';
import { api } from '../api';

interface StudentDashboardProps {
  student: Student;
  onLogout: () => void;
  onUpdateProfile?: (studentId: string, updatedData: Partial<Student>) => void;
  logs?: AttendanceLog[];
}

const DetailItem = ({ label, status }: { label: string; status: string }) => (
  <div className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-xs">
    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
    <span className={`text-[10px] font-extrabold ${status === 'Missed' ? 'text-rose-500' : 'text-emerald-600'}`}>
      {status === 'Missed' ? '● MISSED' : status}
    </span>
  </div>
);

const StudentDashboard: React.FC<StudentDashboardProps> = ({ student, onLogout, onUpdateProfile, logs = [] }) => {
  const [activeSection, setActiveSection] = useState<'profile' | 'receipts'>('profile');
  const [showFineDetails, setShowFineDetails] = useState(true);
  const [profilePic, setProfilePic] = useState<string | null>(student.profilePic || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editData, setEditData] = useState({
    name: student.name,
    organization: student.organization,
    subOrganization: student.subOrganization || '',
    year: student.year || 1
  });

  const [fines, setFines] = useState<any[]>([]);
  const [isLoadingFines, setIsLoadingFines] = useState(true);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const fetchFines = useCallback(async () => {
    setIsLoadingFines(true);
    try {
      const data = await api.getStudentFines(student.studentId);
      setFines(data.uncollected || []);
    } catch (err) {
      console.error("Error fetching fines:", err);
    } finally {
      setIsLoadingFines(false);
    }
  }, [student.studentId]);

  useEffect(() => {
    fetchFines();
  }, [fetchFines, student]);

  const handleMarkPaid = async (fine: any) => {
    const fineIndex = (student.finesActive || []).findIndex(f => f._id === fine._id);
    if (fineIndex === -1) return;
    setMarkingPaidId(fine._id || 'temp');
    const ok = await api.markFinePaid(student.studentId, fineIndex);
    if (ok) {
      await fetchFines();
    }
    setMarkingPaidId(null);
  };

  const steps = getClearanceSteps(student);
  const clearedCount = steps.filter(step => student.clearanceStatus?.[step.id]).length;
  const totalOffices = steps.length;
  const isClearedAll = totalOffices > 0 && clearedCount === totalOffices && fines.length === 0;

  const studentLogs = useMemo(() => {
    const map = new Map<string, any>();
    logs.filter(log => log.rfidUid === student.rfidUid).forEach(log => {
      if (!log.timestamp) return;
      const date = new Date(log.timestamp).toLocaleDateString('en-PH');
      const eventName = log.eventName || "General Event";
      const key = `${date}_${eventName}`;
      if (!map.has(key)) map.set(key, { eventName, date, amIn: 'Missed', amOut: 'Missed', pmIn: 'Missed', pmOut: 'Missed' });
      const entry = map.get(key)!;
      const timeString = new Date(log.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
      const scanAction = (log.session || log.action || "").toLowerCase();
      const value = log.status === 'Absent' ? 'Absent' : timeString;
      if (scanAction.includes('morning in') || scanAction.includes('am in')) entry.amIn = value;
      else if (scanAction.includes('morning out') || scanAction.includes('am out')) entry.amOut = value;
      else if (scanAction.includes('afternoon in') || scanAction.includes('pm in')) entry.pmIn = value;
      else if (scanAction.includes('afternoon out') || scanAction.includes('pm out')) entry.pmOut = value;
      else if (entry.amIn === 'Missed') entry.amIn = value;
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, student]);

  const missedEvents = useMemo(() => {
    return studentLogs.filter(log => 
      log.amIn === 'Missed' || log.amOut === 'Missed' || 
      log.pmIn === 'Missed' || log.pmOut === 'Missed'
    );
  }, [studentLogs]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setProfilePic(base64String);
        if (onUpdateProfile) {
          await onUpdateProfile(student.studentId, { profilePic: base64String });
          setUploadStatus('success');
          setTimeout(() => setUploadStatus('idle'), 3000);
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (onUpdateProfile) {
      await onUpdateProfile(student.studentId, editData);
      setIsEditing(false);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  const subOrgOptions: Record<string, string[]> = {
    CCS: ['CCSO', 'PSITS'],
    ESO: ['ICEPEP', 'JIECEP', 'PICE'],
    NABA: ['TEACHWISE', 'DTO', 'FSMO', 'ELX', 'KATAHUM']
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-4xl shadow-xs">
          <div className="flex items-center gap-3 pl-2">
            <span className="text-2xl">🎓</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Student Portal</p>
              <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">CampusSync Clearance</h1>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSection('profile')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeSection === 'profile'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100'
              }`}
            >
              👤 Profile & Dashboard
            </button>
            <button
              onClick={() => setActiveSection('receipts')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeSection === 'receipts'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                  : 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100'
              }`}
            >
              🧾 My Receipts
            </button>
          </div>
        </div>

        {/* Profile View Section */}
        {activeSection === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Student Digital ID Card & Info (lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Professional ID Card Layout */}
              <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden relative">
                
                {/* ID Header card color gradient */}
                <div className="bg-linear-to-br from-slate-900 via-indigo-950 to-indigo-900 p-6 text-white text-center relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                  <p className="text-[8px] font-black tracking-[0.25em] uppercase text-indigo-300">CAMPUSSYNC ACADEMIC ID</p>
                  <p className="text-md font-black uppercase tracking-tight mt-1 leading-none">OFFICIAL STUDENT</p>
                </div>

                {/* Profile Pic Holder and Identity */}
                <div className="p-6 pt-0 -translate-y-8 flex flex-col items-center text-center">
                  
                  {/* Base64 Upload circle */}
                  <div className="relative group">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-[1.75rem] bg-white border-4 border-white shadow-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-all flex items-center justify-center text-4xl shrink-0"
                    >
                      {profilePic ? (
                        <img src={profilePic} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        "👤"
                      )}
                    </div>
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-xl shadow-md hover:scale-110 active:scale-95 transition-all no-print cursor-pointer border border-white"
                    >
                      {isUploading ? "⏳" : "📷"}
                    </button>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>

                  {/* Status Toast */}
                  {uploadStatus === 'success' && (
                    <p className="text-[8px] font-black text-emerald-600 uppercase mt-2 animate-bounce">✓ Profile Saved!</p>
                  )}

                  {/* Student Text Info */}
                  <div className="mt-4 w-full">
                    {isEditing ? (
                      <div className="space-y-2 mt-2 animate-in zoom-in-95 duration-200">
                        <input 
                          type="text" 
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-extrabold text-xs outline-none focus:ring-2 focus:ring-blue-400" 
                          value={editData.name} 
                          onChange={(e) => setEditData({...editData, name: e.target.value})}
                          placeholder="Full Name"
                        />
                        <div className="grid grid-cols-3 gap-1.5">
                          <select 
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-extrabold text-slate-700 outline-none"
                            value={editData.organization}
                            onChange={(e) => setEditData({...editData, organization: e.target.value as any, subOrganization: ''})}
                          >
                            <option value="CCS">CCS</option>
                            <option value="ESO">ESO</option>
                            <option value="NABA">NABA</option>
                          </select>
                          <select 
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-extrabold text-slate-700 outline-none"
                            value={editData.subOrganization}
                            onChange={(e) => setEditData({...editData, subOrganization: e.target.value})}
                          >
                            <option value="">Dept</option>
                            {subOrgOptions[editData.organization]?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <select 
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-extrabold text-slate-700 outline-none"
                            value={editData.year}
                            onChange={(e) => setEditData({...editData, year: parseInt(e.target.value)})}
                          >
                            <option value={1}>1st Yr</option>
                            <option value={2}>2nd Yr</option>
                            <option value={3}>3rd Yr</option>
                            <option value={4}>4th Yr</option>
                          </select>
                        </div>
                        <button 
                          onClick={handleSaveProfile}
                          className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          Save Profile
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight leading-snug">{student.name}</h2>
                        <p className="text-[10px] font-mono text-slate-400 font-bold uppercase mt-1">ID: {student.studentId}</p>
                        
                        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-blue-100">
                            {student.course}
                          </span>
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-slate-200">
                            Year {student.year}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Horizontal Divider */}
                  <div className="w-full h-px bg-slate-100 my-4" />

                  {/* ID metadata */}
                  <div className="w-full space-y-2 text-left text-[11px] font-bold text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[9px] font-black uppercase tracking-wider">RFID CARD:</span>
                      <span className="font-mono text-slate-700">{student.rfidUid || 'No RFID Card Registered'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[9px] font-black uppercase tracking-wider">CLEARANCE:</span>
                      <span className={isClearedAll ? "text-emerald-600 font-extrabold" : "text-amber-600"}>
                        {isClearedAll ? "✓ CLEARED" : "⚠️ ACTIONS REQUIRED"}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Account Quick Settings Cards */}
              <div className="bg-white rounded-4xl border border-slate-200 shadow-sm p-5 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Student Actions</p>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isEditing 
                      ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  📝 {isEditing ? 'Cancel Edit' : 'Edit Profile Information'}
                </button>
                <button 
                  onClick={onLogout}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  🚪 Logout Student Portal
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: Key Metrics Dashboard & Clearance Steps (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* 3 Grid Dashboard Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* 1. Clearance Progress Card */}
                <div className="bg-white rounded-4xl border border-slate-200 shadow-sm p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl shadow-inner shrink-0">✓</div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Offices Cleared</p>
                    <p className="text-xl font-black text-slate-800">{clearedCount} / {totalOffices}</p>
                    <div className="w-20 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-indigo-600" style={{ width: `${totalOffices > 0 ? (clearedCount / totalOffices) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>

                {/* 2. Penalties Outstanding Card */}
                <div className={`bg-white rounded-4XL border shadow-sm p-6 flex items-center gap-4 ${
                  student.fines.total > 0 ? 'border-rose-100 bg-rose-50/10' : 'border-slate-200'
                }`}>
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0 ${
                    student.fines.total > 0 ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-emerald-50 text-emerald-500'
                  }`}>
                    {student.fines.total > 0 ? '⚠️' : '✓'}
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Penalties Total</p>
                    <p className={`text-xl font-black ${student.fines.total > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₱{student.fines.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 leading-none">
                      {fines.length} uncollected fines
                    </p>
                  </div>
                </div>

                {/* 3. Attendance node stats */}
                <div className="bg-white rounded-4xl border border-slate-200 shadow-sm p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-xl shadow-inner shrink-0">📡</div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Attendance Node</p>
                    <p className="text-xl font-black text-slate-800">
                      {missedEvents.length === 0 ? 'PERFECT' : `${studentLogs.length - missedEvents.length} / ${studentLogs.length}`}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 leading-none">
                      {missedEvents.length} missed sessions
                    </p>
                  </div>
                </div>

              </div>

              {/* Clearance Offices checklist card */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Council Clearance Status</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Verify that all student council and custodian clearance checkpoints are completed.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {steps.map((step) => {
                    const isCleared = student.clearanceStatus?.[step.id];
                    return (
                      <div
                        key={step.id}
                        className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${
                          isCleared 
                            ? 'bg-emerald-50/20 border-emerald-100/60' 
                            : 'bg-slate-50/60 border-slate-200/80 shadow-inner'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                            isCleared ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isCleared ? '✓' : '●'}
                          </span>
                          <div>
                            <p className="text-xs font-extrabold text-slate-800">{step.label}</p>
                            <p className="text-[8px] text-slate-400 uppercase font-black tracking-wider mt-0.5">
                              {isCleared ? 'Cleared and signed' : 'Clearance Pending'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {steps.length === 0 && (
                    <div className="col-span-2 text-center py-6 text-slate-400 bg-slate-50 rounded-2xl">
                      <p className="text-xs">No clearance checkpoints mapped for your council group.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fines & Attendance Penalties Card */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Uncollected Attendance Fines</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Track missed attendances penalties. Mark paid to request validation.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-100">
                        <th className="px-5 py-4">Event Name</th>
                        <th className="px-5 py-4">Date Issued</th>
                        <th className="px-5 py-4">Fine Amount</th>
                        <th className="px-5 py-4 text-right">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {fines.length > 0 ? (
                        fines.map((fine, idx) => {
                          const isPending = fine.status === 'pending';
                          const statusLabel = isPending ? '⏳ Awaiting Approval' : '⚠️ Awaiting Payment';
                          return (
                            <tr key={fine._id || idx} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-5 py-4">
                                <p className="text-slate-800 font-black text-sm leading-tight">{fine.eventName}</p>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  <span className="inline-block px-2 py-0.5 rounded text-[8px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    {fine.organization}
                                  </span>
                                  {fine.attendancePhase && (
                                    <span className="inline-block px-2 py-0.5 rounded text-[8px] font-black bg-rose-50 text-rose-600 border border-rose-100">
                                      Missed: {fine.attendancePhase}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap">
                                <p className="font-bold text-slate-600">
                                  {new Date(fine.dateIssued).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap">
                                <p className="font-black text-rose-600 text-sm">
                                  ₱{(fine.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </p>
                              </td>
                              <td className="px-5 py-4 text-right whitespace-nowrap">
                                <div className="flex flex-col items-end gap-1.5">
                                  <span className={`inline-flex items-center text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                    isPending
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                                  }`}>
                                    {statusLabel}
                                  </span>
                                  {!isPending && (
                                    <button
                                      onClick={() => handleMarkPaid(fine)}
                                      disabled={markingPaidId === fine._id}
                                      className="text-[9px] 'font-black' uppercase px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-sm shadow-blue-100 hover:shadow-blue-200 cursor-pointer disabled:opacity-40"
                                    >
                                      {markingPaidId === fine._id ? '⏳ Processing...' : '💳 Mark Paid'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-16 bg-slate-50/10">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                              <span className="text-3xl">✨</span>
                              <p className="text-xs font-black uppercase tracking-widest">No Outstanding Penalties</p>
                              <p className="text-[10px] text-slate-400">All penalties are cleared and verified.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attendance & Logs History Accordion */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Card Scan Logs & History</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Inspect raw card scan logs recorded by campus RFID nodes.</p>
                  </div>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-[10px] font-black bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                  >
                    {showHistory ? 'Hide Scan History' : 'Show Scan History'}
                  </button>
                </div>

                {showHistory && (
                  <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    {studentLogs.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Card Scans Logged</p>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">Please scan your student ID card on esp32 reader nodes during events.</p>
                      </div>
                    ) : (
                      studentLogs.map((log, idx) => {
                        const hasMissed = log.amIn === 'Missed' || log.amOut === 'Missed' || log.pmIn === 'Missed' || log.pmOut === 'Missed';
                        const key = `${log.eventName}_${log.date}`;
                        const isExpanded = expandedEvent === key;
                        return (
                          <div key={idx} className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 ${
                            isExpanded ? 'border-blue-200 ring-2 ring-blue-50' : 'border-slate-100 hover:border-slate-200 shadow-xs'
                          }`}>
                            <button 
                              onClick={() => setExpandedEvent(isExpanded ? null : key)}
                              className="w-full p-4 flex justify-between items-center text-left"
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-[11px] font-bold text-slate-700">{log.eventName}</p>
                                  {hasMissed && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>}
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium">{log.date}</p>
                              </div>
                              <span className={`transition-transform duration-300 text-[10px] ${isExpanded ? 'rotate-180 text-blue-500' : 'text-slate-300'}`}>▼</span>
                            </button>
                            {isExpanded && (
                              <div className="px-4 pb-4 bg-slate-50/50 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                <div className="h-px bg-slate-200/50 mb-3" />
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                   <DetailItem label="AM IN" status={log.amIn} />
                                   <DetailItem label="AM OUT" status={log.amOut} />
                                   <DetailItem label="PM IN" status={log.pmIn} />
                                   <DetailItem label="PM OUT" status={log.pmOut} />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* My Receipts View Section */}
        {activeSection === 'receipts' && (
          <div className="max-w-4xl w-full mx-auto">
            <MyReceipts
              studentId={student.studentId}
              studentName={student.name}
              studentOrg={student.organization}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default StudentDashboard;
