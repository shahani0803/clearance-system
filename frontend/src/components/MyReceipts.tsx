import React, { useEffect, useState } from 'react';
import { api } from '../api';
import ReceiptModal from './ReceiptModal';

interface CollectedFine {
  _id?: string;
  eventName: string;
  organization: string;
  subOrganization?: string;
  amount: number;
  status: string;
  dateIssued: string;
  studentMarkedPaidAt?: string;
  adminApprovedAt?: string;
  notes?: string;
}

interface MyReceiptsProps {
  studentId: string;
  studentName: string;
  studentOrg: string;
}

const generateReceiptId = (date?: string) => {
  const d = date ? new Date(date) : new Date();
  const timestamp = d.getTime().toString().slice(-8);
  // Create deterministic ID based on date
  const dateHash = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `REC-${dateHash}-${timestamp.slice(-3)}`;
};

const MyReceipts: React.FC<MyReceiptsProps> = ({ studentId, studentName, studentOrg }) => {
  const [receipts, setReceipts] = useState<CollectedFine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<CollectedFine | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    loadReceipts();
  }, [studentId]);

  const loadReceipts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getStudentFines(studentId);
      const collectedFines = data.collected || [];
      setReceipts(collectedFines);
      const total = collectedFines.reduce((sum, fine) => sum + (fine.amount || 0), 0);
      setTotalAmount(total);
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Your Receipts…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">My Receipts</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">View and print your payment receipts and history</p>
        </div>
        <button
          onClick={loadReceipts}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {receipts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Total Paid</p>
            <p className="text-3xl font-black text-emerald-700">
              ₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-sm p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Receipts Issued</p>
            <p className="text-3xl font-black text-blue-700">{receipts.length}</p>
          </div>
          <div className="bg-purple-50 rounded-2xl border border-purple-200 shadow-sm p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-2">Status</p>
            <p className="text-lg font-black text-purple-700">✓ All Paid</p>
          </div>
        </div>
      )}

      {/* Receipts Table */}
      {receipts.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4">Receipt Number</th>
                  <th className="px-6 py-4">Event/Fine</th>
                  <th className="px-6 py-4">Organization</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Date Paid</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((receipt, idx) => {
                  const receiptId = generateReceiptId(receipt.adminApprovedAt);
                  const paidDate = receipt.adminApprovedAt
                    ? new Date(receipt.adminApprovedAt).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : '—';

                  return (
                    <tr key={receipt._id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-mono font-black text-slate-700">{receiptId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{receipt.eventName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <span className="inline-block bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border border-blue-200">
                            {receipt.organization}
                          </span>
                          {receipt.subOrganization && (
                            <span className="inline-block bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border border-slate-200">
                              {receipt.subOrganization}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-emerald-600">
                          ₱{(receipt.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-600">{paidDate}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedReceipt(receipt)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 font-bold rounded-lg border border-purple-200 transition-all text-[10px] uppercase"
                        >
                          🧾 View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-emerald-50/40 border-t border-emerald-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Showing {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-4">
              <span className="text-[10px] font-black text-slate-500 uppercase">Total Amount:</span>
              <span className="text-sm font-black text-emerald-600">
                ₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="text-4xl">🧾</p>
            <p className="text-sm font-bold text-slate-700">No receipts yet</p>
            <p className="text-[10px] text-slate-400 max-w-xs">
              Once you pay a fine and it's approved by an admin, your receipts will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          fine={selectedReceipt}
          student={{
            name: studentName,
            studentId: studentId,
            organization: studentOrg
          }}
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};

export default MyReceipts;
