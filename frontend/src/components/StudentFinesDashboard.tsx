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
  <div className="flex flex-col p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">{label}</span>
    <span className={`text-[9px] font-bold ${status === 'Missed' ? 'text-rose-500' : 'text-emerald-600'}`}>
      {status === 'Missed' ? '● MISSED' : status}
    </span>
  </div>
);

const StudentDashboard: React.FC<StudentDashboardProps> = ({ student, onLogout, onUpdateProfile, logs = [] }) => {
  const [activeSection, setActiveSection] = useState<'profile' | 'receipts'>('profile');
  const [showFineDetails, setShowFineDetails] = useState(false);
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 py-12">
      {/* Navigation Tabs */}
      <div className="max-w-4xl w-full mx-auto mb-6 flex gap-3">
        <button
          onClick={() => setActiveSection('profile')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
            activeSection === 'profile'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          👤 Profile
        </button>
        <button
          onClick={() => setActiveSection('receipts')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
            activeSection === 'receipts'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🧾 My Receipts
        </button>
      </div>

      {/* Profile View */}
      {activeSection === 'profile' && (
      <div className="max-w-md w-full mx-auto bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-200 relative">

        {/* Header / Profile Card */}
        <div className="bg-linear-to-br from-indigo-950 via-indigo-900 to-violet-900 p-8 pb-12 text-white relative overflow-hidden">
          <div className="relative z-20 flex justify-between items-start mb-4">
             <button onClick={onLogout} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-xs font-black uppercase tracking-widest">Logout</button>
             <button 
                onClick={() => setIsEditing(!isEditing)} 
                className={`p-2 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${isEditing ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
             >
                {isEditing ? 'Cancel' : 'Edit Info'}
             </button>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">

            {/* PROFILE PICTURE SECTION */}
            <div className="relative mb-4 group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-4xl bg-white/20 border-4 border-white/30 overflow-hidden cursor-pointer hover:border-white transition-all flex items-center justify-center text-3xl shadow-xl"
              >
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  "👤"
                )}
              </div>
              {/* Floating Camera Icon */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`absolute bottom-0 right-0 p-2 rounded-xl shadow-lg hover:scale-110 transition-all no-print ${isUploading ? 'bg-slate-200 text-slate-400' : 'bg-white text-blue-600'
                  }`}
              >
                {isUploading ? (
                  <span className="animate-spin block">🔄</span>
                ) : (
                  '📷'
                )}
              </button>

              {/* STATUS NOTIFICATION */}
              {uploadStatus === 'success' && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-black px-4 py-2 rounded-full shadow-lg animate-bounce whitespace-nowrap">
                  ✅ PROFILE UPDATED SUCCESSFULLY
                </div>
              )}
              {uploadStatus === 'error' && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[9px] font-black px-4 py-2 rounded-full shadow-lg animate-bounce whitespace-nowrap">
                  ❌ UPLOAD FAILED. TRY AGAIN.
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/*"
              />
            </div>

            {isEditing ? (
              <div className="w-full space-y-3 animate-in zoom-in-95 duration-200">
                <input 
                  type="text" 
                  className="w-full p-3 bg-white/10 rounded-xl text-center font-bold outline-none border border-white/20 focus:border-white" 
                  value={editData.name} 
                  onChange={(e) => setEditData({...editData, name: e.target.value})}
                  placeholder="Your Name"
                />
                <div className="grid grid-cols-3 gap-2">
                  <select 
                    className="p-3 bg-white/10 rounded-xl text-xs font-bold outline-none border border-white/20"
                    value={editData.organization}
                    onChange={(e) => setEditData({...editData, organization: e.target.value as any, subOrganization: ''})}
                  >
                    <option value="CCS" className="text-slate-900">CCS</option>
                    <option value="ESO" className="text-slate-900">ESO</option>
                    <option value="NABA" className="text-slate-900">NABA</option>
                  </select>
                  <select 
                    className="p-3 bg-white/10 rounded-xl text-xs font-bold outline-none border border-white/20"
                    value={editData.subOrganization}
                    onChange={(e) => setEditData({...editData, subOrganization: e.target.value})}
                  >
                    <option value="" className="text-slate-900">Dept</option>
                    {subOrgOptions[editData.organization]?.map(opt => (
                      <option key={opt} value={opt} className="text-slate-900">{opt}</option>
                    ))}
                  </select>
                  <select 
                    className="p-3 bg-white/10 rounded-xl text-xs font-bold outline-none border border-white/20"
                    value={editData.year}
                    onChange={(e) => setEditData({...editData, year: parseInt(e.target.value)})}
                  >
                    <option value={1} className="text-slate-900">1st Yr</option>
                    <option value={2} className="text-slate-900">2nd Yr</option>
                    <option value={3} className="text-slate-900">3rd Yr</option>
                    <option value={4} className="text-slate-900">4th Yr</option>
                  </select>
                </div>
                <button 
                  onClick={handleSaveProfile}
                  className="w-full py-3 bg-white text-blue-600 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-blue-50 transition-all"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <>
                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Verified Student</p>
                <h2 className="text-3xl font-black mb-3 leading-tight drop-shadow-sm">{student.name}</h2>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md">
                    {student.course}
                  </span>
                  <span className="px-3 py-1 bg-indigo-500/30 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md">
                    {student.year === 1 ? '1st' : student.year === 2 ? '2nd' : student.year === 3 ? '3rd' : '4th'} Year
                  </span>
                  <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black tracking-widest font-mono">
                    {student.studentId}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Background Decor */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-xl"></div>
        </div>

        <div className="p-6 space-y-5 -translate-y-6 bg-white rounded-t-[2.5rem]">

          {/* Total Penalties Card */}
          <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            <div
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-100/50 transition-colors"
              onClick={() => setShowFineDetails(!showFineDetails)}
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Penalties</p>
                <p className={`text-3xl font-black ${student.fines.total > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ₱{student.fines.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner ${student.fines.total > 0 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                {student.fines.total > 0 ? '⚠️' : '✅'}
              </div>
            </div>

            {showFineDetails && student.fineHistory && student.fineHistory.length > 0 && (
              <div className="px-5 pb-5 space-y-3 border-t border-slate-200/60 pt-4 animate-in slide-in-from-top-2 duration-300">
                 <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Penalty Breakdown</p>
                 {student.fineHistory.slice(-5).map((h, i) => (
                   <div key={i} className="flex justify-between text-[10px] font-bold text-slate-600">
                     <span className="opacity-60">{h.event}</span>
                     <span className="font-mono text-rose-500">₱{h.amount.toFixed(2)}</span>
                   </div>
                 ))}
                 <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                 >
                   <span>{showHistory ? 'Hide Attendance Records' : 'View Attendance Records'}</span>
                   <span className={`transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`}>▼</span>
                 </button>
              </div>
            )}
            {!showFineDetails && (
               <div className="px-5 pb-4">
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full py-3 bg-white border-2 border-indigo-100 text-indigo-600 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                  >
                    <span>{showHistory ? 'Hide Attendance Records' : 'View Attendance Records'}</span>
                    <span className={`transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`}>▼</span>
                  </button>
               </div>
            )}
          </div>

          {/* Clearance Checklist */}
          <div>
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.15em]">Clearance Progress</h3>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                {clearedCount} / {totalOffices} Offices
              </span>
            </div>

            <div className="space-y-2">
              {steps.map((step) => {
                const isCleared = student.clearanceStatus?.[step.id];
                return (
                  <div
                    key={step.id}
                    className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${isCleared ? 'bg-emerald-50/30 border-emerald-100 shadow-none' : 'bg-white border-slate-100 shadow-sm'
                      }`}
                  >
                    <span className="capitalize text-slate-700 font-bold text-xs tracking-tight">
                      {step.label}
                    </span>
                    {isCleared ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-black text-[9px] uppercase tracking-widest">
                        <span className="text-sm">✓</span> Cleared
                      </span>
                    ) : (
                      <span className="text-slate-300 font-black text-[9px] uppercase tracking-widest italic">
                        Pending
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Outstanding Fines Table/List */}
          <div className="mt-6">
            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.15em] mb-4 px-2">Outstanding Fines</h3>
            {isLoadingFines ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                <span className="animate-spin inline-block mr-2">🔄</span> Loading fines...
              </div>
            ) : fines.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/30 border border-dashed border-emerald-200 rounded-3xl">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">✨ No Outstanding Fines</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">You are clear of any penalties!</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3">Event Name</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Fine Amount</th>
                        <th className="px-5 py-3 text-right">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fines.map((fine, idx) => {
                        const isPending = fine.status === 'pending';
                        const statusLabel = isPending ? 'Paid' : 'Unpaid';
                        return (
                          <tr key={fine._id || idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-4">
                              <p className="text-xs font-bold text-slate-800 leading-tight">{fine.eventName}</p>
                              <p className="text-[8px] text-slate-400 font-black uppercase mt-0.5">{fine.organization}</p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-[10px] font-bold text-slate-600">
                                {new Date(fine.dateIssued).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-xs font-black text-rose-600">
                                ₱{(fine.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </p>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                <span className={`inline-flex items-center text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  isPending
                                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                                    : 'bg-rose-100 text-rose-600 border-rose-200'
                                }`}>
                                  {statusLabel}
                                </span>
                                {!isPending && (
                                  <button
                                    onClick={() => handleMarkPaid(fine)}
                                    disabled={markingPaidId === fine._id}
                                    className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-all disabled:opacity-40"
                                  >
                                    {markingPaidId === fine._id ? '⏳' : '💳 Mark Paid'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Missed Events Section */}
          {showHistory && (
            <div className="pt-1 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex justify-between items-center mb-2 px-2">
                <h3 className="font-black text-slate-800 text-[9px] uppercase tracking-widest">Attendance History</h3>
                {missedEvents.length > 0 ? (
                  <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase border border-rose-100">
                    {missedEvents.length} Missed
                  </span>
                ) : (
                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase border border-emerald-100">
                    Perfect
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {studentLogs.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No records found</p>
                  </div>
                ) : studentLogs.map((log, idx) => {
                  const hasMissed = log.amIn === 'Missed' || log.amOut === 'Missed' || log.pmIn === 'Missed' || log.pmOut === 'Missed';
                  const key = `${log.eventName}_${log.date}`;
                  const isExpanded = expandedEvent === key;
                  return (
                    <div key={idx} className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-blue-200 ring-2 ring-blue-50' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}>
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
                          <div className="grid grid-cols-2 gap-2">
                             <DetailItem label="AM IN" status={log.amIn} />
                             <DetailItem label="AM OUT" status={log.amOut} />
                             <DetailItem label="PM IN" status={log.pmIn} />
                             <DetailItem label="PM OUT" status={log.pmOut} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl shadow-slate-200 mt-4"
          >
            Logout Portal
          </button>

          <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            &copy; 2026 CampusSync v1.0 • RFID Enabled
          </p>
        </div>
      </div>
      )}

      {/* My Receipts View */}
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
  );
};

export default StudentDashboard;
