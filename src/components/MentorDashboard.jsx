import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Calendar,
  CheckSquare,
  FileText,
  PlusCircle,
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  MessageSquare,
  Lock,
  Award
} from 'lucide-react';

export default function MentorDashboard({ onSelectMentee, onOpenCheckin, onOpenScheduleModal, onOpenMomModal }) {
  const { currentUser } = useApp();
  const [relationships, setRelationships] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [selectedMenteeId, setSelectedMenteeId] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const fetchDashboardData = async () => {
    try {
      // Fetch relationships where user is mentor
      const relRes = await fetch(`/api/relationships?user_id=${currentUser.id}&role=mentor`);
      const relData = await relRes.json();
      setRelationships(relData);
      if (relData.length > 0) setSelectedMenteeId(relData[0].mentee_id);

      // Fetch upcoming sessions
      const sessRes = await fetch(`/api/sessions?user_id=${currentUser.id}`);
      const sessData = await sessRes.json();
      setSessions(sessData);

      // Fetch action items
      const actRes = await fetch(`/api/moms/action-items`);
      const actData = await actRes.json();
      setActionItems(actData);

      // Fetch private notes
      const notesRes = await fetch(`/api/moms/notes?mentor_id=${currentUser.id}`);
      const notesData = await notesRes.json();
      setNotes(notesData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote || !selectedMenteeId) return;

    const rel = relationships.find(r => r.mentee_id == selectedMenteeId);
    if (!rel) return;

    try {
      await fetch('/api/moms/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationship_id: rel.id,
          mentor_id: currentUser.id,
          mentee_id: selectedMenteeId,
          note: newNote,
          is_private: 1
        })
      });
      setNewNote('');
      fetchDashboardData();
    } catch (e) {
      console.error(e);
    }
  };

  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'in_progress');

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Mentees</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{relationships.length}</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Upcoming Sessions</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{upcomingSessions.length}</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Action Items</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {actionItems.filter(a => a.status !== 'completed').length}
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed Sessions</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{pastSessions.length}</div>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Mentees & Quick Check-in */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Mentees List (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800 flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Assigned Mentees</span>
            </h2>
            <button
              onClick={onOpenScheduleModal}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Schedule Session</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {relationships.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No assigned mentees found.</div>
            ) : (
              relationships.map((rel) => (
                <div key={rel.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <img
                      src={rel.mentee_avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'}
                      alt={rel.mentee_name}
                      className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-800 text-sm">{rel.mentee_name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          rel.health_status === 'excellent' ? 'bg-emerald-100 text-emerald-800' :
                          rel.health_status === 'good' ? 'bg-blue-100 text-blue-800' :
                          rel.health_status === 'needs_attention' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          Health: {rel.health_status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{rel.mentee_department} • {rel.mentee_year}</p>
                      <p className="text-xs text-slate-600 mt-1 italic">Interests: {rel.mentee_interests}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onSelectMentee(rel.mentee_id)}
                      className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      View Profile & Goals
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Check-in & Session Actions (1 col) */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-lg p-5 shadow-sm border border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Session Check-In & Verification</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Check in to your active mentoring session and optionally upload photo evidence with EXIF location metadata.
            </p>
            <button
              onClick={onOpenCheckin}
              className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded text-xs text-white transition-colors flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Start Session Check-In</span>
            </button>
          </div>

          {/* Upcoming Sessions List */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Upcoming Sessions</span>
            </h3>
            <div className="space-y-3">
              {upcomingSessions.length === 0 ? (
                <div className="text-xs text-slate-500">No scheduled upcoming sessions.</div>
              ) : (
                upcomingSessions.map((s) => (
                  <div key={s.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                    <div className="font-semibold text-slate-800">{s.title}</div>
                    <div className="text-slate-500 mt-0.5">With: {s.mentee_name}</div>
                    <div className="text-slate-500 mt-0.5 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{s.scheduled_start}</span>
                    </div>
                    <div className="mt-2 flex space-x-2">
                      <button
                        onClick={() => onOpenMomModal(s)}
                        className="px-2 py-1 bg-slate-800 text-white rounded text-[11px] font-medium hover:bg-slate-700"
                      >
                        Record MoM
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Private Mentor Notes Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center space-x-2">
          <Lock className="w-4 h-4 text-amber-600" />
          <span>Private Mentor Notes & Observations</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Notes written here are private to you and coordinators. They are not visible to mentees.
        </p>

        <form onSubmit={handleAddNote} className="mb-4 flex flex-col sm:flex-row gap-3">
          <select
            value={selectedMenteeId}
            onChange={(e) => setSelectedMenteeId(e.target.value)}
            className="p-2 border border-slate-300 rounded text-xs bg-slate-50 font-medium text-slate-800"
          >
            <option value="">Select Mentee</option>
            {relationships.map(r => (
              <option key={r.mentee_id} value={r.mentee_id}>{r.mentee_name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Write observation or coaching note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="flex-1 p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded hover:bg-slate-700 transition-colors"
          >
            Save Private Note
          </button>
        </form>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="text-xs text-slate-400 italic">No notes recorded yet.</div>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="p-3 bg-amber-50/50 border border-amber-200/60 rounded text-xs flex justify-between items-start">
                <div>
                  <span className="font-semibold text-slate-900">Mentee: {n.mentee_name}</span>
                  <p className="text-slate-700 mt-0.5">{n.note}</p>
                </div>
                <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
