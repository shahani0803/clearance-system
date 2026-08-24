import React, { useEffect, useState } from 'react';
import { api } from '../api';
import ReceiptModal from './ReceiptModal';

interface Fine {
  eventName: string;
  organization: string;
  subOrganization?: string;
  amount: number;
  status: 'active' | 'pending' | 'approved' | 'collected';
  dateIssued: string;
  studentMarkedPaidAt?: string;
  adminApprovedAt?: string;
  notes?: string;
}

interface StudentFinesData {
  uncollected: Fine[];
  collected: Fine[];
  totalUncollected: number;
  totalCollected: number;
}

const StudentFines: React.FC<{ studentId: string; studentName?: string; studentOrg?: string; studentYear?: string; studentSubOrg?: string }> = ({ studentId, studentName = '', studentOrg = '', studentYear = '', studentSubOrg = '' }) => {
  const [finesData, setFinesData] = useState<StudentFinesData>({
    uncollected: [],
    collected: [],
    totalUncollected: 0,
    totalCollected: 0
  });
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);
  const [selectedFine, setSelectedFine] = useState<any | null>(null);

  useEffect(() => {
    loadFines();
  }, [studentId]);

  const loadFines = async () => {
    setLoading(true);
    const data = await api.getStudentFines(studentId);
    setFinesData(data);
    setLoading(false);
  };

  const handleMarkPaid = async (index: number) => {
    setMarkingPaid(index);
    const success = await api.markFinePaid(studentId, index);
    if (success) {
      await loadFines();
    }
    setMarkingPaid(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading fines…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Outstanding Fines</p>
          <p className="text-3xl font-black text-rose-600">
            ₱{finesData.totalUncollected.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">{finesData.uncollected.length} active</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Settled Fines</p>
          <p className="text-3xl font-black text-emerald-600">
            ₱{finesData.totalCollected.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">{finesData.collected.length} collected</p>
        </div>
      </div>

      {/* Active Fines */}
      {finesData.uncollected.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-rose-50/50 border-b border-rose-100">
            <h3 className="text-sm font-black text-rose-900 uppercase">Outstanding Fines</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {finesData.uncollected.map((fine, idx) => (
              <div key={idx} className="p-5 hover:bg-slate-50/50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-slate-800">{fine.eventName}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      <span className="inline-block bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {fine.organization}
                      </span>
                      {fine.subOrganization && (
                        <span className="ml-2 inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          {fine.subOrganization}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-rose-600">
                      ₱{fine.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`inline-block text-[8px] font-black uppercase px-2 py-1 rounded-full mt-2 ${
                      fine.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {fine.status === 'pending' ? '⏳ Pending Approval' : '⚠️ ' + fine.status}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 mb-3">
                  Issued: {new Date(fine.dateIssued).toLocaleDateString('en-PH')}
                </p>

                {fine.notes && (
                  <p className="text-[10px] text-slate-500 italic mb-3 bg-slate-50 p-2 rounded">
                    {fine.notes}
                  </p>
                )}

                {fine.status === 'active' && (
                  <button
                    onClick={() => handleMarkPaid(finesData.uncollected.indexOf(fine))}
                    disabled={markingPaid === finesData.uncollected.indexOf(fine)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    {markingPaid === finesData.uncollected.indexOf(fine) ? '⏳ Processing…' : '💳 Pay Fine'}
                  </button>
                )}

                {fine.status === 'pending' && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-[10px] text-amber-800">
                      <strong>Waiting for admin approval</strong><br />
                      {fine.studentMarkedPaidAt && (
                        <>Marked paid on {new Date(fine.studentMarkedPaidAt).toLocaleDateString('en-PH')}</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collected Fines */}
      {finesData.collected.length > 0 && (
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-emerald-50/50 border-b border-emerald-100">
            <h3 className="text-sm font-black text-emerald-900 uppercase">Settled Fines</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {finesData.collected.map((fine, idx) => (
              <div key={idx} className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800">{fine.eventName}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      <span className="inline-block bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {fine.organization}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-600">
                      ₱{fine.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="inline-block text-[8px] font-black uppercase px-2 py-1 rounded-full mt-2 bg-emerald-100 text-emerald-700">
                      ✓ Collected
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFine(fine)}
                  className="mt-3 w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs font-bold rounded-lg transition-colors border border-purple-200"
                >
                  🧾 View Receipt
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {finesData.uncollected.length === 0 && finesData.collected.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">✨</p>
          <p className="text-sm font-bold text-slate-700">No fines recorded</p>
          <p className="text-[10px] text-slate-400 mt-1">Keep up the attendance!</p>
        </div>
      )}

      {selectedFine && (
        <ReceiptModal
          fine={selectedFine}
          student={{
            name: studentName,
            studentId: studentId,
            organization: studentOrg,
            year: studentYear,
            subOrganization: studentSubOrg
          }}
          isOpen={!!selectedFine}
          onClose={() => setSelectedFine(null)}
        />
      )}
    </div>
  );
};

export default StudentFines;
