import React, { useState } from 'react';
import { api } from '../api';

interface PaymentReceiptModalProps {
  fine: {
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
  };
  student: {
    name: string;
    studentId: string;
    organization: string;
    year?: string | number;
  };
  studentIndex?: number;
  fineIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  fine,
  student,
  fineIndex,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [amountPaid, setAmountPaid] = useState<string>(fine.amount.toString());
  const [adminName, setAdminName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const generateReceiptId = () => {
    const timestamp = new Date().getTime().toString().slice(-8);
    const random = (fine._id ? fine._id.slice(-4).toUpperCase() : Math.random().toString(36).substring(2, 5).toUpperCase());
    return `REC-${timestamp}-${random}`;
  };

  const receiptId = generateReceiptId();
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = currentDate.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleSubmit = async (e: React.FormEvent, shouldPrint: boolean) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. If amount was edited, save it first on the backend & resign block
      if (amount !== fine.amount && fine._id) {
        const editRes = await api.editFine(student.studentId, fine._id, amount);
        if (!editRes || !editRes.success) {
          setError(editRes?.error || 'Failed to update fine amount.');
          setIsProcessing(false);
          return;
        }
      }

      // 2. Approve payment (marks paid and moves to collections immediately)
      const success = await api.approveFinePaid(student.studentId, fineIndex);

      if (success) {
        if (shouldPrint) {
          // Trigger print dialog
          setTimeout(() => {
            window.print();
          }, 100);
        }

        // Close modal and refresh data
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else {
        setError('Failed to process payment. Please try again.');
      }
    } catch (err) {
      setError('Error processing payment. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const amountNum = parseFloat(amountPaid) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
        
        {/* Header with Close Button */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between no-print z-10">
          <div className="flex items-center gap-2">
            <span className="text-xl">💳</span>
            <h2 className="text-md font-black text-slate-800 uppercase tracking-wider">Process Direct Payment & Issue Receipt</h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Form Layout - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 no-print">
          
          {/* Left Column: Input Form fields */}
          <div className="lg:col-span-6 p-8 border-b lg:border-b-0 lg:border-r border-slate-100 space-y-6">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">Step 1 of 2</span>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Payment Details</h3>
              <p className="text-xs text-slate-400">Fill in or modify payment info. Amount changes will update the blockchain.</p>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl animate-pulse">
                <p className="text-rose-700 text-xs font-bold">⚠️ {error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Student details (read only cards) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Student:</span>
                  <span className="text-slate-800 font-extrabold">{student.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Student ID:</span>
                  <span className="text-slate-700 font-mono font-bold">{student.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Organization:</span>
                  <span className="text-slate-700 font-bold">{student.organization}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Clearance Item:</span>
                  <span className="text-slate-800 font-extrabold text-right max-w-[200px] truncate">{fine.eventName}</span>
                </div>
              </div>

              {/* Amount Paid Field - EDITABLE */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Amount Settled ₱ (Editable)
                </label>
                <div className="relative rounded-2xl shadow-inner">
                  <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 text-lg font-extrabold pointer-events-none">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full pl-9 pr-4 py-3.5 border-2 border-indigo-500 rounded-2xl text-slate-800 font-black text-xl outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              {/* Cashier/Admin Name input */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Authorized Admin / Cashier
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Dean, Officer Name"
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Receipt Preview */}
          <div className="lg:col-span-6 p-8 bg-slate-50/50 flex flex-col justify-between space-y-6">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Step 2 of 2</span>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Receipt Live Preview</h3>
              <p className="text-xs text-slate-400">This is a live mock of the generated cryptographic receipt.</p>
            </div>

            {/* Simulated Receipt design */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-xs text-slate-800 max-h-[400px] overflow-y-auto">
              <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-350">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">OFFICIAL PAYMENT RECEIPT</span>
                <p className="text-md font-black text-slate-800 leading-none mt-1">CampusSync Clearance Network</p>
                <p className="text-[9px] text-slate-400 font-mono mt-1">Receipt ID: {receiptId}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[8px]">Student:</span>
                  <span className="font-extrabold text-slate-700">{student.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[8px]">Event Fine:</span>
                  <span className="font-bold text-slate-700">{fine.eventName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-b border-slate-100">
                  <span className="text-slate-500 font-black uppercase text-[9px]">Grand Total:</span>
                  <span className="text-emerald-600 font-black text-lg">
                    ₱{amountNum.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[8px]">Authorized:</span>
                  <span className="font-bold text-slate-700 font-mono">{adminName || 'Validated Cashier Node'}</span>
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-[8px] font-mono text-indigo-700">
                ⛓️ Cryptographic ledger signature block is auto-generated on submission.
              </div>
            </div>

            {/* Bottom Actions for popup view */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer disabled:bg-slate-300"
              >
                💾 Save Only
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-100 cursor-pointer disabled:bg-slate-300"
              >
                {isProcessing ? '⏳ Saving...' : '🖨️ Save & Print'}
              </button>
            </div>
          </div>
        </div>

        {/* Hidden Official Print-Only Receipt View */}
        <div className="hidden print:block print:p-8 space-y-6 text-slate-800">
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
          <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
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

            <div className="space-y-3 border-l border-slate-200/60 pl-6">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Transaction Status</p>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Settled On</p>
                <p className="text-xs font-bold text-slate-700">{formattedDate} at {formattedTime}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Status</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                      ₱{amountNum.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50 text-sm">
                    <td className="px-5 py-4 text-right text-slate-500 font-black uppercase tracking-wider">Total Settled:</td>
                    <td className="px-5 py-4 text-right text-emerald-600 font-black whitespace-nowrap text-lg">
                      ₱{amountNum.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Ledger secure validation */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">⛓️ Cryptographic Ledger Secure Validation</span>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider">
                Blockchain Secured
              </span>
            </div>
            <p className="text-[9px] text-slate-500 font-medium">This transaction hash block is automatically appended to the student's fine clearance ledger network and signed using the validator node signature below.</p>
          </div>

          {/* Signatures & Footer */}
          <div className="border-t border-slate-200 pt-8 mt-6">
            <div className="grid grid-cols-2 gap-8 text-center text-xs font-bold">
              <div>
                <p className="h-12 flex items-center justify-center text-slate-800 text-xs font-black">{adminName || 'Authorized Cashier'}</p>
                <p className="h-px bg-slate-300/80 mx-4 mb-2"></p>
                <p className="text-[10px] uppercase font-black tracking-wider text-slate-700">AUTHORIZED BY / CASHIER</p>
              </div>
              <div>
                <p className="h-12 flex items-center justify-center text-slate-800 text-xs font-black">{student.name}</p>
                <p className="h-px bg-slate-300/80 mx-4 mb-2"></p>
                <p className="text-[10px] uppercase font-black tracking-wider text-slate-700">STUDENT SIGNATURE</p>
              </div>
            </div>
            
            <div className="text-center pt-8 space-y-1">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Thank you for your payment!</p>
              <p className="text-[9px] text-slate-400 font-medium leading-none">This receipt was processed using a secure cryptographic ledger and serves as official clearance validation.</p>
            </div>
          </div>
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
          .bg-slate-50/50 {
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentReceiptModal;
