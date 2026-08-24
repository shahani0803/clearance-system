import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BlockRecord {
  _id: string;
  studentId: string;
  status: string;
  timestamp: string;
  previousHash: string;
  currentHash: string;
}

interface ValidationResult {
  isValid: boolean;
  totalBlocks: number;
  invalidBlocks: { blockId: string; blockNumber: number; issue: string }[];
  details: string;
}

interface BlockchainStats {
  totalBlocks: number;
  totalStudentBlocks: number;
  uniqueStudents: number;
  latestTimestamp?: string;
}

interface FineRecord {
  _id?: string;
  eventName: string;
  organization: string;
  subOrganization?: string;
  amount: number;
  status: string;
  dateIssued: string;
  currentHash?: string;
  previousHash?: string;
  studentName?: string;
  studentId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BASE = `http://${window.location.hostname}:5001/api`;

const short = (h: string, n = 10) =>
  h && h.length > n * 2 ? `${h.slice(0, n)}…${h.slice(-n)}` : h;

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
};

const parseStatus = (s: string) => {
  try { return JSON.parse(s); } catch { return null; }
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string; value: string | number; sub?: string;
  color: string; icon: string;
}> = ({ label, value, sub, color, icon }) => (
  <div className={`rounded-3xl border p-5 flex flex-col gap-2 shadow-sm bg-white ${color}`}>
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <span className="text-xl">{icon}</span>
    </div>
    <span className="text-3xl font-black text-slate-800 leading-none">{value}</span>
    {sub && <span className="text-[10px] text-slate-400 font-medium">{sub}</span>}
  </div>
);

const HashPill: React.FC<{ hash: string; label?: string }> = ({ hash, label }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>}
      <div className="flex items-center gap-2 bg-slate-900 rounded-xl px-3 py-2">
        <code className="text-[10px] text-emerald-400 font-mono flex-1 truncate">{short(hash, 14)}</code>
        <button onClick={copy} title="Copy full hash"
          className="text-[9px] font-black text-slate-400 hover:text-emerald-400 transition-colors shrink-0 uppercase">
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BlockchainVerification: React.FC = () => {
  const [blockchain, setBlockchain] = useState<BlockRecord[]>([]);
  const [fineHashes, setFineHashes] = useState<FineRecord[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [activeTab, setActiveTab] = useState<'chain' | 'fines' | 'visualize'>('chain');
  const [searchQ, setSearchQ] = useState('');
  const [tamperResult, setTamperResult] = useState<any>(null);
  const [tamperLoading, setTamperLoading] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bcRes, valRes, stRes, finesRes] = await Promise.all([
        fetch(`${BASE}/blockchain`),
        fetch(`${BASE}/blockchain/validate`),
        fetch(`${BASE}/blockchain/stats`),
        fetch(`${BASE}/fines/uncollected/all`),
      ]);

      const bcData = await bcRes.json();
      const valData = await valRes.json();
      const stData = await stRes.json();
      const finesData = await finesRes.json();

      setBlockchain(Array.isArray(bcData) ? bcData : []);
      setValidation(valData);
      setStats(stData);

      // Collect all fines that have a hash
      const uncollected: FineRecord[] = (finesData?.uncollected || []).filter(
        (f: FineRecord) => f.currentHash
      );
      setFineHashes(uncollected);
    } catch (err) {
      console.error('❌ Error fetching blockchain data:', err);
      notify('Failed to load blockchain data. Check server connection.', 'error');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Verify ─────────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${BASE}/blockchain/validate`);
      const data = await res.json();
      setValidation(data);
      notify(data.isValid ? '✅ Blockchain verified – all blocks are intact!' : '⛔ Tampering detected!', data.isValid ? 'success' : 'error');
    } catch {
      notify('Verification failed. Server unreachable.', 'error');
    }
    setVerifying(false);
  };

  // ── Tamper detect ──────────────────────────────────────────────────────────
  const handleDetect = async () => {
    setTamperLoading(true);
    setTamperResult(null);
    try {
      const res = await fetch(`${BASE}/blockchain/detect-tampering`);
      const data = await res.json();
      setTamperResult(data);
    } catch {
      notify('Tamper detection failed.', 'error');
    }
    setTamperLoading(false);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isBlockInvalid = (id: string) =>
    validation?.invalidBlocks?.some(b => b.blockId === id) ?? false;

  const filteredBlocks = blockchain
    .filter(b => {
      if (filter === 'valid') return !isBlockInvalid(b._id);
      if (filter === 'invalid') return isBlockInvalid(b._id);
      return true;
    })
    .filter(b =>
      !searchQ ||
      b.studentId.toLowerCase().includes(searchQ.toLowerCase()) ||
      b.currentHash.toLowerCase().includes(searchQ.toLowerCase())
    );

  const invalidCount = validation?.invalidBlocks?.length ?? 0;
  const validCount = blockchain.length - invalidCount;

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 min-h-screen">

      {/* ── Toast ── */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-black shadow-xl animate-pulse ${
          notification.type === 'success' ? 'bg-slate-900 text-emerald-400' : 'bg-rose-600 text-white'
        }`}>
          {notification.msg}
        </div>
      )}

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-4xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-slate-800">
        {/* animated orbs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-2xl">⛓️</div>
              <div>
                <p className="text-[10px] font-black tracking-[0.25em] uppercase text-indigo-400">SHA-256 Secured</p>
                <h1 className="text-3xl font-black tracking-tight leading-tight">Blockchain Explorer</h1>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium max-w-lg leading-relaxed">
              Immutable audit trail of all clearance approvals and fine transactions. Every record is cryptographically signed and linked.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-black text-white transition-all disabled:opacity-50 uppercase tracking-widest"
            >
              <span className={loading ? 'animate-spin inline-block' : 'inline-block'}>🔄</span>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-black text-white transition-all disabled:opacity-50 uppercase tracking-widest shadow-lg shadow-emerald-500/20"
            >
              🛡️ {verifying ? 'Verifying…' : 'Verify Chain'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Blocks" value={stats?.totalBlocks ?? 0} sub="incl. genesis" icon="🧱" color="border-indigo-100" />
        <StatCard label="Student Records" value={stats?.totalStudentBlocks ?? 0} sub="clearance approvals" icon="🎓" color="border-emerald-100" />
        <StatCard label="Unique Students" value={stats?.uniqueStudents ?? 0} sub="distinct users" icon="👤" color="border-violet-100" />
        <div className={`rounded-3xl border-2 p-5 flex flex-col gap-2 shadow-sm ${
          validation?.isValid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
        }`}>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Chain Status</span>
          <span className={`text-2xl font-black ${validation?.isValid ? 'text-emerald-600' : 'text-rose-600'}`}>
            {validation === null ? '—' : validation.isValid ? '✓ VALID' : '✗ TAMPERED'}
          </span>
          <span className="text-[10px] font-medium text-slate-400">{invalidCount} invalid · {validCount} valid</span>
        </div>
      </div>

      {/* ── Integrity Banner ── */}
      {validation && (
        <div className={`rounded-3xl border-2 p-5 flex items-start gap-4 ${
          validation.isValid ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
        }`}>
          <span className="text-3xl mt-0.5">{validation.isValid ? '✅' : '⛔'}</span>
          <div className="flex-1">
            <p className={`text-sm font-black ${validation.isValid ? 'text-emerald-900' : 'text-rose-900'}`}>
              {validation.isValid ? 'Blockchain integrity verified — all blocks are intact and unmodified.' : 'Tampering detected! One or more blocks have been modified.'}
            </p>
            <p className={`text-xs mt-1 font-medium ${validation.isValid ? 'text-emerald-700' : 'text-rose-700'}`}>{validation.details}</p>
            {!validation.isValid && validation.invalidBlocks?.length > 0 && (
              <div className="mt-3 space-y-1">
                {validation.invalidBlocks.map((b, i) => (
                  <div key={i} className="text-[10px] bg-white/60 text-rose-800 px-3 py-1.5 rounded-lg font-mono">
                    Block #{b.blockNumber}: {b.issue}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm uppercase tracking-widest shrink-0"
          >
            {verifying ? '…' : 'Re-check'}
          </button>
        </div>
      )}

      {/* ── Tamper Detection Panel ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Tamper Detection Scan</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Runs a deep scan across the entire blockchain to detect any unauthorized modifications.</p>
          </div>
          <button
            onClick={handleDetect}
            disabled={tamperLoading}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-sm"
          >
            {tamperLoading ? '🔍 Scanning…' : '🔍 Run Scan'}
          </button>
        </div>
        {tamperResult && (
          <div className={`rounded-2xl border p-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-48 ${
            tamperResult.tamperingDetected ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {JSON.stringify(tamperResult, null, 2)}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-slate-100 bg-slate-50/40 px-4 pt-4 gap-1">
          {([
            { id: 'chain', label: '🧱 Block Chain', sub: `${blockchain.length} blocks` },
            { id: 'fines', label: '💳 Fine Hashes', sub: `${fineHashes.length} hashed` },
            { id: 'visualize', label: '🔗 Chain Visualizer', sub: '' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-white border border-b-white border-slate-200 text-indigo-700 -mb-px z-10 relative'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.sub && <span className="ml-1.5 text-[8px] opacity-60">({tab.sub})</span>}
            </button>
          ))}
        </div>

        {/* ── TAB: Block Chain ── */}
        {activeTab === 'chain' && (
          <div className="p-5 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-40">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search by Student ID or hash…"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700"
                />
              </div>
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                {(['all', 'valid', 'invalid'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      filter === f ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-700'
                    }`}>
                    {f === 'all' ? `All (${blockchain.length})` : f === 'valid' ? `✓ Valid (${validCount})` : `✗ Invalid (${invalidCount})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {filteredBlocks.length === 0 ? (
              <div className="py-20 text-center">
                <span className="text-4xl opacity-30">⛓️</span>
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest mt-3">No blocks found</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3">Block #</th>
                      <th className="px-5 py-3">Student ID</th>
                      <th className="px-5 py-3">Current Hash</th>
                      <th className="px-5 py-3">Previous Hash</th>
                      <th className="px-5 py-3">Timestamp</th>
                      <th className="px-5 py-3 text-center">Integrity</th>
                      <th className="px-5 py-3 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredBlocks.map((block, idx) => {
                      const invalid = isBlockInvalid(block._id);
                      const isGenesis = block.studentId === '00000';
                      const expanded = expandedBlock === block._id;
                      const parsed = parseStatus(block.status);
                      return (
                        <React.Fragment key={block._id}>
                          <tr className={`transition-colors ${invalid ? 'bg-rose-50/40' : 'hover:bg-slate-50/60'}`}>
                            <td className="px-5 py-4">
                              <span className={`text-xs font-black ${isGenesis ? 'text-violet-600' : 'text-slate-700'}`}>
                                #{idx}
                              </span>
                              {isGenesis && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[8px] font-black rounded-md uppercase">Genesis</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-mono text-xs font-bold text-indigo-600">
                                {isGenesis ? 'GENESIS' : block.studentId}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <code className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                                {short(block.currentHash, 8)}
                              </code>
                            </td>
                            <td className="px-5 py-4">
                              <code className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                                {block.previousHash === '0' ? 'genesis' : short(block.previousHash, 8)}
                              </code>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[10px] text-slate-500 font-medium">{fmtDate(block.timestamp)}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                invalid
                                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}>
                                {invalid ? '✗ Invalid' : '✓ Valid'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <button
                                onClick={() => setExpandedBlock(expanded ? null : block._id)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-lg uppercase tracking-widest transition-colors"
                              >
                                {expanded ? '▲ Hide' : '▼ View'}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Row */}
                          {expanded && (
                            <tr className={invalid ? 'bg-rose-50/30' : 'bg-indigo-50/20'}>
                              <td colSpan={7} className="px-6 py-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Current Hash */}
                                  <div className="bg-slate-900 rounded-2xl p-4 space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Hash (SHA-256)</p>
                                    <code className="text-[10px] text-emerald-400 font-mono break-all leading-relaxed">{block.currentHash}</code>
                                  </div>
                                  {/* Previous Hash */}
                                  <div className="bg-slate-900 rounded-2xl p-4 space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Previous Hash</p>
                                    <code className="text-[10px] text-indigo-400 font-mono break-all leading-relaxed">
                                      {block.previousHash === '0' ? '0000…0000 (Genesis)' : block.previousHash}
                                    </code>
                                  </div>
                                  {/* Status / Clearance */}
                                  <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Clearance Status</p>
                                    {parsed ? (
                                      <div className="space-y-1">
                                        {Object.entries(parsed).map(([k, v]) => (
                                          <div key={k} className="flex items-center justify-between">
                                            <span className="text-[10px] font-semibold text-slate-600 capitalize">{k}</span>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                              v ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                                            }`}>{v ? '✓ Cleared' : 'Pending'}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <pre className="text-[10px] text-slate-600 whitespace-pre-wrap break-all">{block.status}</pre>
                                    )}
                                  </div>
                                </div>
                                {invalid && (
                                  <div className="mt-4 bg-rose-100 border border-rose-200 rounded-2xl p-4">
                                    <p className="text-xs font-black text-rose-800">⛔ Block Integrity Compromised</p>
                                    {validation?.invalidBlocks.filter(b => b.blockId === block._id).map((b, i) => (
                                      <p key={i} className="text-[10px] text-rose-700 mt-1">Issue: {b.issue}</p>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Fine Hashes ── */}
        {activeTab === 'fines' && (
          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Fine Transaction Hashes</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                All uncollected fine records that have been cryptographically signed and recorded.
              </p>
            </div>
            {fineHashes.length === 0 ? (
              <div className="py-20 text-center">
                <span className="text-4xl opacity-30">💳</span>
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest mt-3">No hashed fine records found</p>
                <p className="text-[10px] text-slate-400 mt-1">Fines appear here once they are blockchain-signed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fineHashes.map((fine, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 hover:border-indigo-200 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-xs font-black text-slate-800">{fine.eventName}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {fine.studentName && <span className="font-mono">{fine.studentName} · </span>}
                          {fine.organization}{fine.subOrganization && ` · ${fine.subOrganization}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-amber-600">₱{fine.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase border ${
                          fine.status === 'approved' || fine.status === 'collected'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : fine.status === 'pending'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-rose-100 text-rose-700 border-rose-200'
                        }`}>{fine.status}</span>
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[8px] font-black rounded-full border border-indigo-200">⛓️ On-chain</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {fine.currentHash && <HashPill hash={fine.currentHash} label="Current Hash" />}
                      {fine.previousHash && <HashPill hash={fine.previousHash} label="Previous Hash" />}
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono">Issued: {fmtDate(fine.dateIssued)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Chain Visualizer ── */}
        {activeTab === 'visualize' && (
          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Hash Chain Visualizer</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Visual representation of how each block links to the previous one. Any break in the chain indicates tampering.
              </p>
            </div>
            <div className="space-y-2 max-h-130 overflow-y-auto pr-1">
              {blockchain.map((block, idx) => {
                const invalid = isBlockInvalid(block._id);
                const isGenesis = block.studentId === '00000';
                return (
                  <div key={block._id} className="flex items-stretch gap-3">
                    {/* Left timeline */}
                    <div className="flex flex-col items-center w-8 shrink-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isGenesis ? 'bg-violet-600 text-white' : invalid ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'
                      }`}>
                        {isGenesis ? '⛓' : `#${idx}`}
                      </div>
                      {idx < blockchain.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-6 mt-1 ${invalid ? 'bg-rose-300' : 'bg-indigo-200'}`} />
                      )}
                    </div>

                    {/* Block card */}
                    <div className={`flex-1 rounded-2xl border p-4 mb-2 text-xs ${
                      invalid ? 'bg-rose-50 border-rose-200' : isGenesis ? 'bg-violet-50 border-violet-200' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <span className={`font-black ${isGenesis ? 'text-violet-700' : 'text-slate-800'}`}>
                            {isGenesis ? 'Genesis Block' : `Student: ${block.studentId}`}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium ml-2">{fmtDate(block.timestamp)}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase border ${
                          invalid ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}>
                          {invalid ? '✗ Invalid' : '✓ Valid'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Hash:</span>
                          <code className="text-[9px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded">{short(block.currentHash, 10)}</code>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Prev:</span>
                          <code className="text-[9px] text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded">
                            {block.previousHash === '0' ? 'genesis' : short(block.previousHash, 10)}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {blockchain.length === 0 && (
                <div className="py-16 text-center">
                  <span className="text-4xl opacity-30">🔗</span>
                  <p className="text-xs font-black text-slate-300 uppercase tracking-widest mt-3">No chain data</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── How It Works ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">⚙️ How It Works</h3>
          <div className="space-y-3">
            {[
              { n: '1', title: 'Hash Creation', desc: 'Student ID + Status + Timestamp are hashed using SHA-256.' },
              { n: '2', title: 'Block Linking', desc: 'Each new block stores the hash of the previous block, forming a chain.' },
              { n: '3', title: 'Verification', desc: 'System recalculates all hashes and compares them against stored values.' },
              { n: '4', title: 'Tamper Detection', desc: 'Any modification breaks the hash chain, immediately flagging the block.' },
            ].map(s => (
              <div key={s.n} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">{s.n}</div>
                <div>
                  <p className="text-xs font-black text-slate-700">{s.title}</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">🔎 Reading the Results</h3>
          <div className="space-y-3">
            {[
              { icon: '✅', color: 'text-emerald-600', title: 'VALID', desc: 'Hash matches. Block data has not been altered since it was recorded.' },
              { icon: '⛔', color: 'text-rose-600', title: 'INVALID / TAMPERED', desc: 'Hash mismatch. Data in this block may have been changed after recording.' },
              { icon: '⛓️', color: 'text-indigo-600', title: 'GENESIS', desc: 'The first block in the chain. Previous hash is 0 by design.' },
              { icon: '💳', color: 'text-amber-600', title: 'FINE HASH', desc: 'A fine transaction was cryptographically signed and recorded on-chain.' },
            ].map(s => (
              <div key={s.title} className="flex gap-3 items-start">
                <span className="text-lg shrink-0">{s.icon}</span>
                <div>
                  <p className={`text-xs font-black ${s.color}`}>{s.title}</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default BlockchainVerification;
