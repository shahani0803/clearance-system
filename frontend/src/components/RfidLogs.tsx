import React from 'react';
import { AttendanceLog, Student } from '../Types';

interface RfidLogsProps {
  logs: AttendanceLog[];
  students?: Student[];
  onSimulate: () => void;
}

const RfidLogs: React.FC<RfidLogsProps> = ({ logs, students = [], onSimulate }) => {
  
  // Create student summaries
  const studentSummaries = React.useMemo(() => {
    return students.map(student => {
      // Get missed count from fineHistory
      const missedCount = student.fineHistory ? student.fineHistory.length : 0;

      // Get last date attended from logs
      const sLogs = logs.filter(l => l.rfidUid === student.rfidUid).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const lastDateAttended = sLogs.length > 0 ? new Date(sLogs[0].timestamp).toLocaleDateString('en-PH') : 'No Record';

      return {
        studentId: student.studentId,
        studentName: student.name,
        rfidUid: student.rfidUid,
        course: student.course,
        lastDateAttended,
        missedCount
      };
    }).sort((a, b) => b.missedCount - a.missedCount); // Sort by most missed events
  }, [logs, students]);

  // Export to CSV Function
  const exportToCSV = () => {
    const headers = ["Student Name", "RFID UID", "Course", "Last Date Attended", "Total Missed Events"];
    const rows = studentSummaries.map(s => [
      s.studentName,
      s.rfidUid,
      s.course,
      s.lastDateAttended,
      s.missedCount.toString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Summary_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Action Header - Hidden during Printing */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Event Attendance Summary</h2>
          <p className="text-sm text-slate-500">Overview of student attendance and missed events</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onSimulate}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition"
          >
            Simulate Scan
          </button>
          <button 
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition"
          >
            Export CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition"
          >
            Print Report
          </button>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Student</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">RFID UID</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Last Date Attended</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Attendance Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {studentSummaries.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">No student records available</td></tr>
            ) : studentSummaries.map((s) => (
              <tr key={s.studentId} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  <p className="text-sm font-semibold text-slate-800">{s.studentName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{s.course}</p>
                </td>
                <td className="p-4 text-sm font-mono text-slate-500">{s.rfidUid}</td>
                <td className="p-4 text-sm font-medium text-slate-600">{s.lastDateAttended}</td>
                <td className="p-4 text-right">
                  {s.missedCount === 0 ? (
                    <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-full border border-emerald-100">
                      Perfect Attendance
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 bg-rose-50 text-rose-600 font-bold text-xs rounded-full border border-rose-100">
                      {s.missedCount} {s.missedCount === 1 ? 'Event' : 'Events'} Missed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer for Print Only */}
      <div className="hidden print:block mt-12 border-t pt-8">
        <div className="flex justify-between">
          <div>
            <p className="text-sm font-bold">Generated By:</p>
            <div className="mt-8 border-b border-black w-48"></div>
            <p className="text-xs mt-1">Authorized Admin Signature</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">Date of Report:</p>
            <p className="text-sm">{new Date().toLocaleDateString('en-PH')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RfidLogs;