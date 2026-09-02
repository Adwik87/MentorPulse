import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  PlusCircle,
  CheckCircle2,
  FileText,
  Video,
  User
} from 'lucide-react';

export default function SessionCalendar({ onOpenScheduleModal, onOpenMomModal, onOpenCheckin }) {
  const { currentUser } = useApp();
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'scheduled', 'completed'

  useEffect(() => {
    if (currentUser) {
      fetchSessions();
    }
  }, [currentUser]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/sessions?user_id=${currentUser.id}`);
      const data = await res.json();
      setSessions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredSessions = sessions.filter(s => filter === 'all' || s.status === filter);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            <span>Mentoring Session Schedule</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">View upcoming, in-progress, and past mentoring sessions.</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-100 p-1 rounded border border-slate-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('scheduled')}
              className={`px-3 py-1 text-xs font-semibold rounded ${filter === 'scheduled' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 text-xs font-semibold rounded ${filter === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Completed
            </button>
          </div>

          <button
            onClick={onOpenScheduleModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center space-x-1"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Schedule Session</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid List View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSessions.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500 text-xs">
            No sessions found matching current filter.
          </div>
        ) : (
          filteredSessions.map((s) => (
            <div key={s.id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-colors flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    s.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                    s.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {s.status.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 flex items-center space-x-1">
                    {s.meeting_type === 'Virtual' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    <span>{s.meeting_type}</span>
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mt-2">{s.title}</h3>
                <p className="text-xs text-slate-600 mt-1">{s.description}</p>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.scheduled_start}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Participants: {s.mentor_name} & {s.mentee_name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Location: {s.location}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={onOpenCheckin}
                  className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-xs font-semibold flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Check In</span>
                </button>

                <button
                  onClick={() => onOpenMomModal(s)}
                  className="px-2.5 py-1.5 bg-slate-800 text-white hover:bg-slate-700 rounded text-xs font-semibold flex items-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>MoM</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
