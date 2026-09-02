import React, { useState, useEffect } from 'react';
import {
  User,
  Target,
  Activity,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  Clock,
  Lock,
  Award,
  FileText
} from 'lucide-react';

export default function MenteeProfile({ menteeId, onBack }) {
  const [mentee, setMentee] = useState(null);
  const [goals, setGoals] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [relationship, setRelationship] = useState(null);

  useEffect(() => {
    if (menteeId) {
      fetchMenteeDetails();
    }
  }, [menteeId]);

  const fetchMenteeDetails = async () => {
    try {
      // User Profile
      const uRes = await fetch(`/api/users/${menteeId}`);
      const uData = await uRes.json();
      setMentee(uData);

      // Relationship
      const rRes = await fetch(`/api/relationships?user_id=${menteeId}&role=mentee`);
      const rData = await rRes.json();
      if (rData.length > 0) {
        setRelationship(rData[0]);

        // Goals
        const gRes = await fetch(`/api/goals?relationship_id=${rData[0].id}`);
        const gData = await gRes.json();
        setGoals(gData);

        // Timeline
        const tRes = await fetch(`/api/analytics/timeline?relationship_id=${rData[0].id}`);
        const tData = await tRes.json();
        setTimeline(tData);
      }

      // Sessions
      const sRes = await fetch(`/api/sessions?user_id=${menteeId}`);
      const sData = await sRes.json();
      setSessions(sData);

    } catch (e) {
      console.error(e);
    }
  };

  if (!mentee) return <div className="p-6 text-xs text-slate-500">Loading mentee profile...</div>;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded text-xs font-semibold flex items-center space-x-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Header Profile Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start space-x-4">
          <img
            src={mentee.avatar_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'}
            alt={mentee.name}
            className="w-20 h-20 rounded-full border-2 border-slate-300 object-cover shadow-sm"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900">{mentee.name}</h1>
              <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-300">
                {mentee.academic_year || 'Mentee'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{mentee.department} • {mentee.email}</p>
            <p className="text-xs text-slate-600 mt-2 font-medium">Interests: <span className="font-normal italic">{mentee.interests}</span></p>
            <p className="text-xs text-slate-600 mt-1 font-medium">Summary Goals: <span className="font-normal">{mentee.goals_summary}</span></p>
          </div>
        </div>

        {relationship && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-700 min-w-[240px]">
            <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Mentorship Health</div>
            <div className="mt-1 flex items-center justify-between">
              <span>Status:</span>
              <span className="font-semibold capitalize text-emerald-600">{relationship.status}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>Health Rating:</span>
              <span className="font-semibold capitalize text-blue-600">{relationship.health_status.replace('_', ' ')}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Mentor:</span>
              <span className="font-semibold">{relationship.mentor_name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Goals & Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals Progress */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center space-x-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span>Goal Progress</span>
          </h3>

          <div className="space-y-4">
            {goals.length === 0 ? (
              <div className="text-xs text-slate-500">No active goals.</div>
            ) : (
              goals.map((g) => (
                <div key={g.id} className="p-3 border border-slate-200 rounded bg-slate-50/50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{g.title}</span>
                    <span className="font-bold text-blue-600">{g.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${g.progress_percentage}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Activity Timeline</span>
          </h3>

          <div className="space-y-3 max-h-80 overflow-y-auto divide-y divide-slate-100">
            {timeline.length === 0 ? (
              <div className="text-xs text-slate-500">No recent activity logged.</div>
            ) : (
              timeline.map((act) => (
                <div key={act.id} className="pt-3 first:pt-0 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{act.title}</span>
                    <span className="text-[10px] text-slate-400">{new Date(act.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{act.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
