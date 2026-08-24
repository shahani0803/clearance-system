import React, { useEffect, useState, useCallback } from 'react';
import { Student } from '../Types';
import { api } from '../api';
import PrintOptionsModal, { PrintOptions } from './PrintOptionsModal';

interface FinesCollectionsProps {
  students?: Student[];
  onNavigateToClearance?: () => void;
}

interface CollectedFine {
  _id?: string;
  eventName: string;
  organization: string;
  subOrganization?: string;
  amount: number;
  status: string;
  dateIssued: string;
  adminApprovedAt?: string;
  studentMarkedPaidAt?: string;
  notes?: string;
  attendancePhase?: string;
  studentId: string;
  studentName: string;
}

interface FinesSummary {
  totalCollected: number;
  totalUncollected: number;
  byOrganization: Record<string, { collected: number; uncollected: number }>;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({
  label, value, sub, color, icon,
}: { label: string; value: string; sub?: string; color: string; icon: string }) => (
  <div className={`bg-white rounded-3xl border shadow-sm p-6 flex items-center gap-5 ${color}`}>
    <div className="text-4xl">{icon}</div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
      {sub && <p className="text-[10px] font-bold text-slate-400 mt-1">{sub}</p>}
    </div>
  </div>
);

// ─── Org bar ─────────────────────────────────────────────────────────────────
const OrgBar = ({
  org, collected, uncollected,
}: { org: string; collected: number; uncollected: number }) => {
  const total = collected + uncollected;
  const pct   = total > 0 ? Math.round((collected / total) * 100) : 0;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs font-black text-slate-700 uppercase tracking-wider">{org}</p>
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{pct}% collected</span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-bold">
        <span className="text-emerald-600">Collected: ₱{collected.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
        <span className="text-rose-500">Uncollected: ₱{uncollected.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
};

// ─── Main Collections Page ────────────────────────────────────────────────────
const FinesCollections: React.FC<FinesCollectionsProps> = ({ students, onNavigateToClearance }) => {
  const [collections, setCollections] = useState<CollectedFine[]>([]);
  const [summary, setSummary]         = useState<FinesSummary>({
    totalCollected: 0,
    totalUncollected: 0,
    byOrganization: {},
  });
  const [isLoading, setIsLoading]     = useState(true);
  const [search, setSearch]           = useState('');
  const [filterOrg, setFilterOrg]     = useState<string>('All');
  const [sortBy, setSortBy]           = useState<'date' | 'amount' | 'student'>('date');
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['studentName', 'eventName', 'organization', 'amount', 'adminApprovedAt', 'status']);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({ printCollections: true, printBreakdown: true });

  const availableColumns = [
    { id: 'studentName', label: 'Student Name' },
    { id: 'studentId', label: 'Student ID' },
    { id: 'eventName', label: 'Event Name' },
    { id: 'organization', label: 'Organization' },
    { id: 'subOrganization', label: 'Sub-organization' },
    { id: 'amount', label: 'Amount' },
    { id: 'dateIssued', label: 'Date Issued' },
    { id: 'adminApprovedAt', label: 'Date Collected' },
    { id: 'status', label: 'Status' },
    { id: 'notes', label: 'Notes' },
  ];

  const load = useCallback(async () => {
    setIsLoading(true);
    const [col, sum] = await Promise.all([
      api.getFinesCollections(),
      api.getFinesSummary(),
    ]);
    setCollections(col.collected || []);
    setSummary({
      totalCollected:   sum.totalCollected,
      totalUncollected: sum.totalUncollected,
      byOrganization:   sum.byOrganization,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = collections
    .filter(f => {
      const q = search.toLowerCase();
      const matchSearch =
        f.studentName?.toLowerCase().includes(q) ||
        f.eventName?.toLowerCase().includes(q) ||
        f.studentId?.toLowerCase().includes(q);
      const matchOrg = filterOrg === 'All' || f.organization === filterOrg;
      return matchSearch && matchOrg;
    })
    .sort((a, b) => {
      if (sortBy === 'date')    return new Date(b.adminApprovedAt || b.dateIssued).getTime() - new Date(a.adminApprovedAt || a.dateIssued).getTime();
      if (sortBy === 'amount')  return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'student') return (a.studentName || '').localeCompare(b.studentName || '');
      return 0;
    });

  const orgs = ['All', 'CCS', 'ESO', 'NABA'];

  const exportToCSV = () => {
    const headers = availableColumns.filter(col => selectedColumns.includes(col.id)).map(col => col.label);
    const rows = filtered.map(fine =>
      availableColumns.filter(col => selectedColumns.includes(col.id)).map(col => {
        let value: any = (fine as any)[col.id];
        if (col.id === 'amount') {
          value = `₱${(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
        } else if (col.id === 'adminApprovedAt' || col.id === 'dateIssued') {
          value = value ? new Date(value).toLocaleDateString('en-PH') : '—';
        }
        return `"${(value || '').toString().replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `Fines_Collections_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setShowColumnPicker(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Collections…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Fine Collections</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Track collected and uncollected fines across all organizations</p>
        </div>
        <div className="flex gap-2 no-print">
          <button
            onClick={load}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            🖨️ Print
          </button>
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              📥 Export CSV
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-4 w-60">
                <p className="text-xs font-black text-slate-600 mb-3 uppercase">Select Columns to Export</p>
                <div className="space-y-2 max-h-80 overflow-y-auto mb-3">
                  {availableColumns.map(col => (
                    <label key={col.id} className="flex items-center gap-2 text-xs text-slate-600 hover:bg-slate-50 p-1.5 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(col.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedColumns([...selectedColumns, col.id]);
                          } else {
                            setSelectedColumns(selectedColumns.filter(c => c !== col.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={exportToCSV}
                  disabled={selectedColumns.length === 0}
                  className="w-full py-2 bg-emerald-600 text-white text-xs font-black rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-slate-300"
                >
                  ✓ Export
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Collections"
          value={`₱${summary.totalCollected.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          sub={`${collections.length} transactions`}
          color="border-emerald-100"
          icon="💰"
        />
        <StatCard
          label="Total Uncollected Fines"
          value={`₱${summary.totalUncollected.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          sub="Unpaid + Pending approval"
          color="border-rose-100"
          icon="⚠️"
        />
        <StatCard
          label="Collection Rate"
          value={
            (() => {
              const grand = summary.totalCollected + summary.totalUncollected;
              return grand > 0 ? `${Math.round((summary.totalCollected / grand) * 100)}%` : '—';
            })()
          }
          sub="of total fines collected"
          color="border-blue-100"
          icon="📈"
        />
      </div>

      {/* ── By Organization ─────────────────────────────────────────────────── */}
      {Object.keys(summary.byOrganization).length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Breakdown by Organization</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(summary.byOrganization).map(([org, data]) => (
              <OrgBar key={org} org={org} collected={data.collected} uncollected={data.uncollected} />
            ))}
          </div>
        </div>
      )}

      {/* ── Collected Records Table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center p-5 border-b border-slate-100 bg-slate-50/30">
          <input
            type="text"
            placeholder="Search by student, event…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-45 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-300 font-medium text-slate-700"
          />

          {/* Org Filter */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
            {orgs.map(org => (
              <button
                key={org}
                onClick={() => setFilterOrg(org)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  filterOrg === org
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {org}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 outline-none cursor-pointer"
          >
            <option value="date">Sort: Date Approved</option>
            <option value="amount">Sort: Amount</option>
            <option value="student">Sort: Student Name</option>
          </select>

          <span className="text-[10px] font-black text-slate-400 uppercase">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
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
                <th className="px-5 py-3">Date Collected</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length > 0 ? filtered.map((fine, i) => (
                <tr key={fine._id || i} className="hover:bg-emerald-50/30 transition-colors">

                  {/* Student */}
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-slate-800 leading-tight">{fine.studentName}</p>
                    <p className="text-[9px] text-slate-400 font-mono uppercase mt-0.5">{fine.studentId}</p>
                  </td>

                  {/* Event / Org */}
                  <td className="px-5 py-4">
                    <p className="text-xs font-bold text-slate-700 leading-tight">{fine.eventName}</p>
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

                  {/* Amount */}
                  <td className="px-5 py-4">
                    <span className="text-sm font-black text-emerald-600">
                      ₱{(fine.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Date Issued */}
                  <td className="px-5 py-4">
                    <p className="text-xs font-medium text-slate-600">
                      {new Date(fine.dateIssued).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>

                  {/* Date Collected */}
                  <td className="px-5 py-4">
                    {fine.adminApprovedAt ? (
                      <p className="text-xs font-bold text-emerald-600">
                        {new Date(fine.adminApprovedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">—</p>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                      fine.status === 'collected'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-blue-100 text-blue-700 border-blue-200'
                    }`}>
                      ✓ {fine.status === 'collected' ? 'Collected' : 'Approved'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center py-24 bg-slate-50/30">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-4xl opacity-30">💰</span>
                      <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                        {search || filterOrg !== 'All' ? 'No records match your filter' : 'No collections yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 bg-emerald-50/40 border-t border-emerald-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Showing {filtered.length} of {collections.length} records
            </p>
            <div className="flex gap-4">
              <span className="text-[10px] font-black text-slate-500 uppercase">Total Shown:</span>
              <span className="text-sm font-black text-emerald-600">
                ₱{filtered.reduce((s, f) => s + (f.amount || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          .space-y-6 {
            margin-top: 0 !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
        }
      `}</style>
    </div>
  );
};

export default FinesCollections;
