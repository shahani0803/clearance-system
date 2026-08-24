import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

interface UncollectedFine {
  _id: string;
  studentId: string;
  studentName: string;
  eventName: string;
  organization: string;
  subOrganization?: string;
  amount: number;
  status: 'active' | 'pending';
  dateIssued: string;
  studentMarkedPaidAt?: string;
  notes?: string;
  attendancePhase?: string;
  currentHash?: string;
  previousHash?: string;
}

const UncollectedFinesAdmin: React.FC = () => {
  const [fines, setFines] = useState<UncollectedFine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');
  const [filterOrg, setFilterOrg] = useState<string>('All');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getUncollectedFines();
    setFines(data.uncollected || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveFineAmount = async (fine: UncollectedFine) => {
    if (!editingAmount.trim()) {
      alert('Amount cannot be empty.');
      return;
    }
    const amountNum = Number(editingAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      alert('Amount must be a valid positive number.');
      return;
    }

    setApprovingId(fine._id);
    const parts = fine._id.split('-');
    const studentId = parts[0];
    const fineId = parts.slice(1).join('-');

    const res = await api.editFine(studentId, fineId, amountNum);
    if (res && res.success) {
      setEditingId(null);
      await load();
    } else {
      alert(res?.error || 'Failed to update fine amount.');
    }
    setApprovingId(null);
  };

  const handleApproveFine = async (fine: UncollectedFine) => {
    setApprovingId(fine._id);
    const parts = fine._id.split('-');
    const studentId = parts[0];
    const fineId = parts.slice(1).join('-');

    // Find the index in the student's finesActive array
    const studentFines = await api.getStudentFines(studentId);
    const fineIndex = studentFines.uncollected.findIndex(f =>
      f.eventName === fine.eventName &&
      f.amount === fine.amount &&
      new Date(f.dateIssued).getTime() === new Date(fine.dateIssued).getTime()
    );

    if (fineIndex >= 0) {
      const success = await api.approveFinePaid(fine.studentId, fineIndex);
      if (success) {
        await load();
      }
    }
    setApprovingId(null);
  };

  const filtered = fines
    .filter(f => {
      const q = search.toLowerCase();
      const matchSearch =
        f.studentName?.toLowerCase().includes(q) ||
        f.eventName?.toLowerCase().includes(q) ||
        f.studentId?.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || f.status === filterStatus;
      const matchOrg = filterOrg === 'All' || f.organization === filterOrg;
      return matchSearch && matchStatus && matchOrg;
    });

  const pendingTotal = filtered
    .filter(f => f.status === 'pending')
    .reduce((sum, f) => sum + f.amount, 0);

  const activeTotal = filtered
    .filter(f => f.status === 'active')
    .reduce((sum, f) => sum + f.amount, 0);

  const orgs = ['All', ...new Set(fines.map(f => f.organization))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Uncollected Fines…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Uncollected Fines</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pending payment and admin approval</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Total Uncollected</p>
          <p className="text-2xl font-black text-amber-600">
            ₱{(pendingTotal + activeTotal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">{filtered.length} records</p>
        </div>

        <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-6">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Awaiting Payment</p>
          <p className="text-2xl font-black text-rose-600">
            ₱{activeTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">{filtered.filter(f => f.status === 'active').length} active</p>
        </div>

        <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Pending Approval</p>
          <p className="text-2xl font-black text-amber-600">
            ₱{pendingTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">{filtered.filter(f => f.status === 'pending').length} pending</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center p-5 border-b border-slate-100 bg-slate-50/30">
          <input
            type="text"
            placeholder="Search student, event…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 'min-w-45' px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-300 font-medium text-slate-700"
          />

          {/* Status Filter */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
            {(['all', 'active', 'pending'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  filterStatus === status
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {status === 'all' ? 'All' : status === 'active' ? 'Awaiting Payment' : 'Pending Approval'}
              </button>
            ))}
          </div>

          {/* Org Filter */}
          <select
            value={filterOrg}
            onChange={e => setFilterOrg(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 outline-none cursor-pointer"
          >
            {orgs.map(org => (
              <option key={org} value={org}>{org}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Event / Organization</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Date Issued</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length > 0 ? filtered.map((fine) => (
                <tr key={fine._id} className="hover:bg-amber-50/30 transition-colors">

                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-slate-800">{fine.studentName}</p>
                    <p className="text-[9px] text-slate-400 font-mono uppercase mt-0.5">{fine.studentId}</p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-xs font-bold text-slate-700">{fine.eventName}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                        {fine.organization}
                      </span>
                      {fine.subOrganization && (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                          {fine.subOrganization}
                        </span>
                      )}
                      {fine.attendancePhase && (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-100">
                          Missed: {fine.attendancePhase}
                        </span>
                      )}
                    </div>
                    {fine.notes && <p className="text-[8px] text-slate-400 italic mt-0.5">{fine.notes}</p>}
                  </td>

                  <td className="px-5 py-4">
                    {editingId === fine._id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">₱</span>
                        <input
                          type="number"
                          value={editingAmount}
                          onChange={e => setEditingAmount(e.target.value)}
                          className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-amber-300 text-slate-800"
                          min="0"
                          required
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-black text-amber-600">
                        ₱{fine.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-xs font-medium text-slate-600">
                      {new Date(fine.dateIssued).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                        fine.status === 'pending'
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-rose-100 text-rose-700 border-rose-200'
                      }`}>
                        {fine.status === 'pending' ? '⏳ Pending' : '⚠️ Active'}
                      </span>
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

                  <td className="px-5 py-4 text-center">
                    {editingId === fine._id ? (
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => handleSaveFineAmount(fine)}
                          disabled={approvingId === fine._id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-[9px] font-black rounded-lg transition-colors cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center items-center">
                        <button
                          onClick={() => {
                            setEditingId(fine._id);
                            setEditingAmount(fine.amount.toString());
                          }}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black rounded-lg transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                        {fine.status === 'pending' ? (
                          <button
                            onClick={() => handleApproveFine(fine)}
                            disabled={approvingId === fine._id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-[9px] font-black rounded-lg transition-colors cursor-pointer"
                          >
                            {approvingId === fine._id ? '…' : '✓ Approve'}
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-400">Awaiting payment</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center py-24 bg-slate-50/30">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-4xl opacity-30">✨</span>
                      <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                        {search || filterOrg !== 'All' ? 'No records match your filter' : 'No uncollected fines'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 bg-amber-50/40 border-t border-amber-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Showing {filtered.length} of {fines.length} records
            </p>
            <span className="text-sm font-black text-amber-600">
              ₱{filtered.reduce((s, f) => s + f.amount, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UncollectedFinesAdmin;
