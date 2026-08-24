import React, { useState, useEffect } from 'react';
import { HistoricalEvent } from '../Types';
import { api } from '../api';
import { Calendar, Users, UserX, CircleDollarSign, ChevronRight, History } from 'lucide-react';

const EventHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoricalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const data = await api.getEventHistory();
      setHistory(data);
      setLoading(false);
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 animate-in fade-in duration-700">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <History className="w-10 h-10 text-blue-600" />
            Event History
          </h1>
          <p className="text-slate-500 font-medium mt-1">Review past events and attendance reports</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* EVENT LIST */}
        <div className="lg:col-span-1 space-y-4">
          {history.length === 0 ? (
            <div className="bg-white p-8 rounded-4xl border border-slate-200 text-center">
              <p className="text-slate-400 font-medium">No finished events yet.</p>
            </div>
          ) : (
            history.map((event) => (
              <button
                key={event._id}
                onClick={() => setSelectedEvent(event)}
                className={`w-full text-left p-6 rounded-4xl border transition-all duration-300 ${
                  selectedEvent?._id === event._id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-[1.02]' 
                  : 'bg-white border-slate-200 text-slate-900 hover:border-blue-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${selectedEvent?._id === event._id ? 'text-blue-100' : 'text-blue-600'}`}>
                    {event.organization} {event.subOrganization ? `• ${event.subOrganization}` : ''}
                  </span>
                  <span className={`text-[10px] font-bold ${selectedEvent?._id === event._id ? 'text-blue-200' : 'text-slate-400'}`}>
                    {new Date(event.date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-black leading-tight mb-4">{event.name}</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span className="text-xs font-bold">{event.attendees.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserX className="w-3 h-3" />
                    <span className="text-xs font-bold">{event.absentees.length}</span>
                  </div>
                  <div className="ml-auto">
                    <ChevronRight className={`w-5 h-5 transition-transform ${selectedEvent?._id === event._id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* DETAILS VIEW */}
        <div className="lg:col-span-2">
          {selectedEvent ? (
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-10 bg-slate-50 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">{selectedEvent.name}</h2>
                    <div className="flex flex-wrap gap-3">
                      <Badge icon={<Calendar className="w-3 h-3"/>} label={new Date(selectedEvent.date).toDateString()} />
                      <Badge icon={<Users className="w-3 h-3"/>} label={`${selectedEvent.attendees.length} Attended`} />
                      <Badge icon={<UserX className="w-3 h-3"/>} label={`${selectedEvent.absentees.length} Absent`} color="bg-red-50 text-red-600 border-red-100" />
                      <Badge icon={<CircleDollarSign className="w-3 h-3"/>} label={`₱${selectedEvent.totalFines.toLocaleString()} Total Fines`} color="bg-emerald-50 text-emerald-600 border-emerald-100" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* ATTENDEES LIST */}
                  <section>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Attendance Record</h4>
                    <div className="space-y-3 max-h-100 overflow-y-auto pr-2 custom-scrollbar">
                      {selectedEvent.attendees.map((a, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div>
                            <p className="text-sm font-black text-slate-800">{a.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{a.session}</p>
                          </div>
                          <span className="text-[10px] font-black text-blue-600">{new Date(a.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* ABSENTEES LIST */}
                  <section>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Absentees & Fines</h4>
                    <div className="space-y-3 max-h-100 overflow-y-auto pr-2 custom-scrollbar">
                      {selectedEvent.absentees.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-red-50/50 rounded-2xl border border-red-100">
                          <div>
                            <p className="text-sm font-black text-slate-800">{s.name}</p>
                            <p className="text-[10px] font-bold text-red-400">ID: {s.studentId}</p>
                          </div>
                          <span className="text-xs font-black text-red-600">₱{s.fineAmount}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
              <div className="bg-white p-6 rounded-full shadow-sm mb-6">
                <History className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-400">Select an event to view details</h3>
              <p className="text-slate-400 max-w-xs mt-2">Pick an event from the history list to see full attendance and fine reports.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Badge = ({ icon, label, color = "bg-white text-slate-600 border-slate-200" }: any) => (
  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black border shadow-sm ${color}`}>
    {icon}
    {label}
  </div>
);

export default EventHistory;
