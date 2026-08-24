import React from 'react';

interface PrintOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (options: PrintOptions) => void;
}

export interface PrintOptions {
  printCollections: boolean;
  printBreakdown: boolean;
}

const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({ isOpen, onClose, onPrint }) => {
  const [options, setOptions] = React.useState<PrintOptions>({
    printCollections: true,
    printBreakdown: true,
  });

  if (!isOpen) return null;

  const handlePrint = () => {
    onPrint(options);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-black text-slate-800">Print Options</h2>
          <p className="text-xs text-slate-500 mt-1">Select what you want to print</p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Collections Table */}
          <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={options.printCollections}
              onChange={(e) => setOptions({ ...options, printCollections: e.target.checked })}
              className="w-5 h-5 mt-0.5 cursor-pointer"
            />
            <div>
              <p className="font-bold text-slate-800">Fine Collections Table</p>
              <p className="text-xs text-slate-500 mt-0.5">Print the detailed table of all collected fines</p>
            </div>
          </label>

          {/* Organization Breakdown */}
          <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={options.printBreakdown}
              onChange={(e) => setOptions({ ...options, printBreakdown: e.target.checked })}
              className="w-5 h-5 mt-0.5 cursor-pointer"
            />
            <div>
              <p className="font-bold text-slate-800">Breakdown by Organization</p>
              <p className="text-xs text-slate-500 mt-0.5">Print the organization summary with collection rates</p>
            </div>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            disabled={!options.printCollections && !options.printBreakdown}
            className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
          >
            🖨️ Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintOptionsModal;
