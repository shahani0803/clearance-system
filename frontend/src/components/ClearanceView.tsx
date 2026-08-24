import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Student, getClearanceSteps } from '../Types';
import { api } from '../api';
import ReceiptModal from './ReceiptModal';
import PaymentReceiptModal from './PaymentReceiptModal';

interface ClearanceViewProps {
  students: Student[];
  onUpdateStatus: (studentId: string, status: Record<string, boolean>) => void;
  onRefresh: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatCurrency = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─────────────────────────────────────────────────────────────────────────────
// ClearanceView Component
// ─────────────────────────────────────────────────────────────────────────────
const ClearanceView: React.FC<ClearanceViewProps> = ({ students = [], onUpdateStatus, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isProcessingCheck, setIsProcessingCheck] = useState<string | null>(null);
  const [isProcessingFine, setIsProcessingFine] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<{ fine: any; student: Student } | null>(null);
  const [activePaymentModal, setActivePaymentModal] = useState<{ fine: any; idx: number } | null>(null);
  
  const [editingFineId, setEditingFineId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');
  
  const [activeEventSettings, setActiveEventSettings] = useState<{ activeEvent?: string; eventDate?: string; isEventSaved?: boolean } | null>(null);
  const [filterByActiveEvent, setFilterByActiveEvent] = useState(false);

  const safeStudents = Array.isArray(students) ? students : [];

  // Notify helper
  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Find the currently selected student from the state
  const selectedStudent = useMemo(() => {
    return safeStudents.find(s => s.studentId === selectedStudentId) || null;
  }, [safeStudents, selectedStudentId]);

  // Set default selection if none selected yet
  useEffect(() => {
    if (!selectedStudentId && safeStudents.length > 0) {
      setSelectedStudentId(safeStudents[0].studentId);
    }
  }, [safeStudents, selectedStudentId]);

  // Fetch active event settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:5001/api/settings`);
        const data = await res.json();
        if (data && data.activeEvent && data.isEventSaved) {
          setActiveEventSettings(data);
          setFilterByActiveEvent(true); // Default to filter by active event if one is running
        }
      } catch (err) {
        console.error("Failed to fetch settings in ClearanceView:", err);
      }
    };
    fetchSettings();
  }, []);

  // Filtered fines for the selected student
  const displayFines = useMemo(() => {
    if (!selectedStudent) return [];
    let fines = selectedStudent.finesActive || [];
    if (filterByActiveEvent && activeEventSettings?.activeEvent) {
      fines = fines.filter(f => f.eventName === activeEventSettings.activeEvent);
    }
    return fines;
  }, [selectedStudent, filterByActiveEvent, activeEventSettings]);

  // Search filtering logic: searches by student name, ID, organization, or fine event name
  const filteredStudents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return safeStudents;

    return safeStudents.filter(student => {
      const matchName = (student.name || '').toLowerCase().includes(q);
      const matchId = (student.studentId || '').includes(q);
      const matchOrg = (student.organization || '').toLowerCase().includes(q) ||
                       (student.subOrganization || '').toLowerCase().includes(q);
      const matchEvent = (student.finesActive || []).some(fine =>
        (fine.eventName || '').toLowerCase().includes(q)
      );

      return matchName || matchId || matchOrg || matchEvent;
    });
  }, [safeStudents, searchTerm]);

  // Toggle clearance step
  const handleToggleStep = async (student: Student, stepId: string) => {
    setIsProcessingCheck(stepId);
    const currentStatus = { ...(student.clearanceStatus || {}) };
    const nextVal = !currentStatus[stepId];
    currentStatus[stepId] = nextVal;

    try {
      await onUpdateStatus(student.studentId, currentStatus);
      notify(`Updated ${stepId.toUpperCase()} clearance status to ${nextVal ? 'CLEARED' : 'PENDING'}.`);
    } catch (err) {
      notify('Failed to update clearance status.', 'error');
    } finally {
      setIsProcessingCheck(null);
    }
  };

  // Pay Fine
  const handlePayFine = async (student: Student, fineIndex: number, fineId: string) => {
    setIsProcessingFine(fineId);
    const ok = await api.markFinePaid(student.studentId, fineIndex);
    if (ok) {
      notify('Payment submitted! Awaiting admin approval.');
      await onRefresh();
    } else {
      notify('Failed to process payment. Please try again.', 'error');
    }
    setIsProcessingFine(null);
  };

  const handleSaveEditFine = async (studentId: string, fineId: string) => {
    if (!editingAmount.trim()) {
      notify('Amount cannot be empty.', 'error');
      return;
    }
    const amountNum = Number(editingAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      notify('Amount must be a valid positive number.', 'error');
      return;
    }
    
    setIsProcessingFine(fineId);
    const res = await api.editFine(studentId, fineId, amountNum);
    if (res && res.success) {
      notify('Fine amount updated and blockchain resigned!');
      setEditingFineId(null);
      await onRefresh();
    } else {
      notify(res?.error || 'Failed to update fine amount.', 'error');
    }
    setIsProcessingFine(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-black shadow-xl animate-in slide-in-from-top-2 duration-300 ${
          notification.type === 'success' ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white'
        }`}>
          {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="relative overflow-hidden bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-4xl p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 space-y-1.5">
          <span className="text-[10px] font-black tracking-[0.25em] uppercase text-indigo-400">
            Clearance Center
          </span>
          <h2 className="text-3xl font-black tracking-tight leading-tight uppercase">
            Clearance Checklist & Fines
          </h2>
          <p className="text-xs text-slate-400 font-medium max-w-lg leading-relaxed">
            Manage student clearance requirements, view outstanding fines, and track blockchain receipts.
          </p>
        </div>
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Two-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Pane: Student Sidebar */}
        <div className="lg:col-span-4 flex flex-col bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden h-175">
          {/* Sidebar Search */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/40 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search Directory</p>
            <div className="relative">
              <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 text-xs pointer-events-none">🔍</span>
              <input
                type="text"
                placeholder="Search student, organization or event…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-slate-700 shadow-inner"
              />
            </div>
          </div>

          {/* Sidebar List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 custom-scrollbar">
            {filteredStudents.length > 0 ? (
              filteredStudents.map(student => {
                const isSelected = student.studentId === selectedStudentId;
                const outstandingCount = (student.finesActive || []).filter(
                  f => f.status === 'active' || f.status === 'pending'
                ).length;
                const steps = getClearanceSteps(student);
                const clearedSteps = steps.filter(step => student.clearanceStatus?.[step.id]).length;
                const isCleared = steps.length > 0 && clearedSteps === steps.length && outstandingCount === 0;

                return (
                  <button
                    key={student.studentId}
                    onClick={() => setSelectedStudentId(student.studentId)}
                    className={`w-full p-4 flex items-center gap-4 text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-50/50 border-l-4 border-indigo-600 pl-3'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                      isCleared 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : outstandingCount > 0
                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {student.profilePic ? (
                        <img src={student.profilePic} alt={student.name} className="h-full w-full object-cover rounded-2xl" />
                      ) : (
                        '👤'
                      )}
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-800 text-xs truncate">{student.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">{student.studentId} · {student.course}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                          {student.organization}
                        </span>
                        {student.subOrganization && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-slate-100 text-slate-500">
                            {student.subOrganization}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats / Status Badges */}
                    <div className="text-right shrink-0">
                      {isCleared ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Cleared
                        </span>
                      ) : outstandingCount > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                          {outstandingCount} Fine{outstandingCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                          {clearedSteps}/{steps.length} Steps
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400">
                <p className="text-2xl mb-2">👥</p>
                <p className="text-xs font-bold uppercase tracking-wider">No matching students</p>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Total Database Records: {safeStudents.length}
            </p>
          </div>
        </div>

        {/* Right Pane: Student Clearance details */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          {selectedStudent ? (
            <div className="space-y-6">
              
              {/* Student Overview Card */}
              <div className="bg-white rounded-4xl border border-slate-200 shadow-sm p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  {/* Photo & Identity */}
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center text-2xl border border-slate-200 overflow-hidden shadow-inner shrink-0">
                      {selectedStudent.profilePic ? (
                        <img src={selectedStudent.profilePic} alt={selectedStudent.name} className="h-full w-full object-cover" />
                      ) : (
                        '👤'
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">{selectedStudent.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 font-semibold">
                        Student ID: <span className="font-mono text-slate-600 font-bold">{selectedStudent.studentId}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                          {selectedStudent.course} - Year {selectedStudent.year}
                        </span>
                        <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                          RFID UID: <span className="font-mono">{selectedStudent.rfidUid}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Header stats */}
                  <div className="flex gap-4">
                    <div className="bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl text-center shadow-inner min-w-25">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Total Fines</p>
                      <p className="text-base font-black text-slate-800 mt-0.5">
                        ₱{(selectedStudent.fines?.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Clearance Status Checklist */}
              <div className="bg-white rounded-4xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Clearance Status Checklist</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Verify department clearances. Status updates are secured to blockchain.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getClearanceSteps(selectedStudent).map(step => {
                    const isCleared = selectedStudent.clearanceStatus?.[step.id] || false;
                    const isBusy = isProcessingCheck === step.id;

                    return (
                      <div
                        key={step.id}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          isCleared
                            ? 'bg-emerald-50/30 border-emerald-100'
                            : 'bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs ${
                            isCleared ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isCleared ? '✓' : '●'}
                          </span>
                          <div>
                            <p className="text-xs font-extrabold text-slate-800">{step.label}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-black">
                              {isCleared ? 'Cleared' : 'Pending Clearance'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleStep(selectedStudent, step.id)}
                          disabled={isBusy}
                          className={`px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border ${
                            isCleared
                              ? 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50 shadow-sm'
                              : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-md shadow-indigo-100'
                          } disabled:opacity-50 cursor-pointer`}
                        >
                          {isBusy ? '⏳ Wait…' : isCleared ? 'Revoke Check' : 'Approve Check'}
                        </button>
                      </div>
                    );
                  })}
                  {getClearanceSteps(selectedStudent).length === 0 && (
                    <div className="col-span-2 text-center py-6 text-slate-400">
                      <p className="text-xs">No clearance steps defined for this student's organization.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Outstanding Fines Table */}
              <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Fines & Attendance Penalties</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Detailed list of outstanding and settled event attendance penalties.</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {activeEventSettings?.activeEvent && (
                      <div className="flex items-center gap-3 bg-indigo-50/50 px-3.5 py-1.5 rounded-2xl border border-indigo-100 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                          <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider">
                            Event: {activeEventSettings.activeEvent}
                          </span>
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer border-l border-indigo-200 pl-3">
                          <input
                            type="checkbox"
                            checked={filterByActiveEvent}
                            onChange={e => setFilterByActiveEvent(e.target.checked)}
                            className="w-3 h-3 text-indigo-600 focus:ring-indigo-400 border-indigo-300 rounded cursor-pointer"
                          />
                          <span className="text-[8px] font-black text-indigo-800 uppercase tracking-widest">
                            Show Missed
                          </span>
                        </label>
                      </div>
                    )}
                    <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                      {displayFines.length} shown · {(selectedStudent.finesActive || []).length} total
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-200">
                        <th className="px-6 py-4">Event Name</th>
                        <th className="px-6 py-4">Date of Event</th>
                        <th className="px-6 py-4">Fine Amount</th>
                        <th className="px-6 py-4 text-center">Payment Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayFines.length > 0 ? (
                        displayFines.map((fine, idx) => {
                          const isPaid = fine.status === 'approved' || fine.status === 'collected';
                          const fineId = `${selectedStudent.studentId}-${idx}`;
                          const isBusy = isProcessingFine === fineId;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/40 transition-all duration-150">
                              
                              {/* Event Name - Prepend Student Name */}
                              <td className="px-6 py-5">
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">
                                  {selectedStudent.name}
                                </p>
                                <p className="text-xs font-extrabold text-slate-800 tracking-tight leading-snug">
                                  {fine.eventName}
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  <span className="inline-block px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wide bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                                    {fine.organization}
                                  </span>
                                  {fine.attendancePhase && (
                                    <span className="inline-block px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wide bg-rose-50 text-rose-600 border border-rose-100">
                                      Missed: {fine.attendancePhase}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Date of Event */}
                              <td className="px-6 py-5 whitespace-nowrap">
                                <p className="text-xs font-bold text-slate-600">
                                  {formatDate(fine.dateIssued)}
                                </p>
                              </td>

                              {/* Fine Amount */}
                              <td className="px-6 py-5 whitespace-nowrap">
                                {editingFineId === fine._id ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-400">₱</span>
                                    <input
                                      type="number"
                                      value={editingAmount}
                                      onChange={e => setEditingAmount(e.target.value)}
                                      className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800"
                                      min="0"
                                      required
                                    />
                                  </div>
                                ) : (
                                  <p className={`text-sm font-black ${isPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {formatCurrency(fine.amount)}
                                  </p>
                                )}
                              </td>

                              {/* Payment Status Badges */}
                              <td className="px-6 py-5 text-center whitespace-nowrap">
                                <div className="flex flex-col items-center gap-1.5">
                                  {isPaid ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-green-100 text-green-800 border border-green-200">
                                      <span className="w-1 h-1 rounded-full bg-green-600"></span>
                                      Paid
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 animate-pulse">
                                      <span className="w-1 h-1 rounded-full bg-red-600"></span>
                                      Unpaid
                                    </span>
                                  )}
                                  
                                  {fine.currentHash ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wide bg-indigo-50 text-indigo-600 border border-indigo-100">
                                      ⛓️ Verified
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wide bg-slate-50 text-slate-400 border border-slate-200">
                                      No Block
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Action Button */}
                              <td className="px-6 py-5 text-right whitespace-nowrap">
                                {editingFineId === fine._id ? (
                                  <div className="flex gap-1.5 justify-end">
                                    <button
                                      onClick={() => handleSaveEditFine(selectedStudent.studentId, fine._id)}
                                      disabled={isBusy}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingFineId(null)}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-wider rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1.5 justify-end items-center">
                                    {!isPaid && (
                                      <button
                                        onClick={() => {
                                          setEditingFineId(fine._id);
                                          setEditingAmount(fine.amount.toString());
                                        }}
                                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    {isPaid ? (
                                      <button
                                        onClick={() => setSelectedReceipt({ fine, student: selectedStudent })}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-wider rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
                                      >
                                        View Receipt
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => setActivePaymentModal({ fine, idx })}
                                        disabled={isBusy}
                                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm ${
                                          fine.status === 'pending'
                                            ? 'bg-amber-550 hover:bg-amber-600 text-white shadow-md shadow-amber-100'
                                            : 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200'
                                        } disabled:opacity-50`}
                                      >
                                        {isBusy ? '⏳ Processing…' : fine.status === 'pending' ? '✓ Approve Payment' : 'Pay Fine'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>

                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-16 bg-slate-50/20">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                              <span className="text-3xl">✨</span>
                              <p className="text-xs font-black uppercase tracking-widest">No Fines Recorded</p>
                              <p className="text-[10px]">Student has no outstanding penalties for missed attendances.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center p-12 text-center h-175">
              <span className="text-5xl mb-4 p-5 bg-indigo-50 text-indigo-500 rounded-4xl shadow-inner">📋</span>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">No Student Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                Please select a student from the sidebar directory directory to view their clearance checklist and manage outstanding fines.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          fine={selectedReceipt.fine}
          student={{
            name: selectedReceipt.student.name || 'No Name',
            studentId: selectedReceipt.student.studentId,
            organization: selectedReceipt.student.organization,
            year: selectedReceipt.student.year?.toString(),
            subOrganization: selectedReceipt.student.subOrganization,
          }}
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Payment & Receipt Generation Modal */}
      {activePaymentModal && selectedStudent && (
        <PaymentReceiptModal
          fine={activePaymentModal.fine}
          student={{
            name: selectedStudent.name || 'No Name',
            studentId: selectedStudent.studentId,
            organization: selectedStudent.organization,
            year: selectedStudent.year?.toString(),
          }}
          fineIndex={activePaymentModal.idx}
          isOpen={!!activePaymentModal}
          onClose={() => setActivePaymentModal(null)}
          onSuccess={async () => {
            notify('Payment approved directly and receipt generated!');
            await onRefresh();
          }}
        />
      )}
    </div>
  );
};

export default ClearanceView;