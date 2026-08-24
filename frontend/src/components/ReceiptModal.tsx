import React from 'react';

interface Fine {
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
  currentHash?: string;
  previousHash?: string;
}

interface ReceiptModalProps {
  fine: Fine;
  student: {
    name: string;
    studentId: string;
    organization: string;
    year?: string | number;
    subOrganization?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ fine, student, isOpen, onClose }) => {
  if (!isOpen) return null;

  const generateReceiptId = () => {
    const timestamp = new Date(fine.adminApprovedAt || fine.dateIssued).getTime().toString().slice(-8);
    const random = (fine._id ? fine._id.slice(-4).toUpperCase() : Math.random().toString(36).substring(2, 5).toUpperCase());
    return `REC-${timestamp}-${random}`;
  };

  const receiptId = generateReceiptId();
  const paidDate = fine.adminApprovedAt ? new Date(fine.adminApprovedAt) : new Date();
  const formattedDate = paidDate.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = paidDate.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity p-4 overflow-y-auto">
      <div className="bg-white rounded-4xl shadow-2xl max-w-2xl w-full border border-slate-100 max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
        
        {/* Header with Close Button */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-8 py-5 flex items-center justify-between no-print z-10">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <h2 className="text-md font-black text-slate-800 uppercase tracking-wider">Clearance Payment Receipt</h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-8 print:p-8 space-y-6 text-slate-800">
          {/* Logo & School Header */}
          <div className="text-center space-y-2 pb-6 border-b border-dashed border-slate-300">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider">
              🎓 CampusSync Academic Network
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">OFFICIAL PAYMENT RECEIPT</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Office of student affairs & organizations</p>
            <div className="mt-3 inline-block bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 text-center font-mono">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Official Receipt Number</span>
              <span className="text-xs font-black text-slate-700 tracking-wider">{receiptId}</span>
            </div>
          </div>

          {/* Student & Receipt Info Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Student Account</p>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Full Name</p>
                <p className="text-sm font-extrabold text-slate-800 leading-none">{student.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Student ID</p>
                  <p className="font-bold text-slate-700 font-mono">{student.studentId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Course & Year</p>
                  <p className="font-bold text-slate-700">{student.organization} · Yr {student.year || '—'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200/60 pt-3 md:pt-0 md:pl-6">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Transaction Status</p>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Settled On</p>
                <p className="text-xs font-bold text-slate-700">{formattedDate} at {formattedTime}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Status</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  ✓ Fully Paid
                </span>
              </div>
            </div>
          </div>

          {/* Payment breakdown */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 pl-1">Payment Item Breakdown</p>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-250 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3 text-right">Penalties Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold">
                  <tr>
                    <td className="px-5 py-4">
                      <p className="text-slate-800 text-sm font-black">{fine.eventName}</p>
                      <p className="text-[9px] text-slate-400 font-black uppercase mt-0.5">{fine.organization} Council Attendance Penalty</p>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap text-slate-900 text-sm font-black">
                      ₱{fine.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50 text-sm">
                    <td className="px-5 py-4 text-right text-slate-500 font-black uppercase tracking-wider">Total Settled:</td>
                    <td className="px-5 py-4 text-right text-emerald-600 font-black whitespace-nowrap text-lg">
                      ₱{fine.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {fine.notes && (
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100/60">
              <p className="text-[9px] text-amber-700 font-black uppercase tracking-widest mb-1">Administrative Notes</p>
              <p className="text-xs text-amber-900 font-medium">{fine.notes}</p>
            </div>
          )}

          {/* Blockchain Verification Ledger */}
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 space-y-3 relative overflow-hidden shadow-inner">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl" />
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">⛓️ Blockchain Verification Ledger</span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider">
                Block Verified
              </span>
            </div>
            <div className="space-y-2 text-[10px] font-mono">
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-400 font-sans text-[9px]">Previous Block Hash:</span>
                <span className="text-slate-200 font-bold truncate max-w-70" title={fine.previousHash}>
                  {fine.previousHash ? fine.previousHash : 'GENESIS_BLOCK_HASH'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-400 font-sans text-[9px]">Current Transaction Hash:</span>
                <span className="text-indigo-300 font-bold truncate max-w-70" title={fine.currentHash}>
                  {fine.currentHash ? fine.currentHash : 'NO_LEDGER_HASH'}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures & Footer */}
          <div className="border-t border-slate-200 pt-8 mt-6">
            <div className="grid grid-cols-2 gap-8 text-center text-xs font-bold">
              <div>
                <p className="h-12 flex items-center justify-center text-slate-300 font-mono text-[9px] italic">System Generated Check</p>
                <p className="h-px bg-slate-300/80 mx-4 mb-2"></p>
                <p className="text-[10px] uppercase font-black tracking-wider text-slate-700">CAMPUSSYNC VALIDATOR</p>
              </div>
              <div>
                <p className="h-12 flex items-center justify-center text-slate-800 text-xs font-black">{student.name}</p>
                <p className="h-px bg-slate-300/80 mx-4 mb-2"></p>
                <p className="text-[10px] uppercase font-black tracking-wider text-slate-700">STUDENT PAIED SIGNATURE</p>
              </div>
            </div>
            
            <div className="text-center pt-8 space-y-1">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Thank you for your payment!</p>
              <p className="text-[9px] text-slate-400 font-medium leading-none">This receipt was processed using a secure cryptographic ledger and serves as official clearance validation.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex gap-3 no-print">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer"
          >
            🖨️ Print Official Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
          >
            ✕ Close View
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .fixed.inset-0 {
            position: static !important;
            background: white !important;
            box-shadow: none !important;
            display: block !important;
            overflow: visible !important;
          }
          .max-h-\\[90vh\\] {
            max-height: none !important;
          }
          .bg-black\\/60 {
            display: none !important;
          }
          .rounded-\\[2rem\\], .rounded-2xl, .rounded-3xl {
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .border, .border-slate-100, .border-slate-200 {
            border: none !important;
          }
          .bg-slate-900 {
            background-color: #f8fafc !important;
            color: #0f172a !important;
            border: 1px solid #e2e8f0 !important;
          }
          .text-indigo-400, .text-indigo-300 {
            color: #4f46e5 !important;
          }
          .text-slate-400 {
            color: #64748b !important;
          }
          .text-slate-100 {
            color: #0f172a !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceiptModal;
