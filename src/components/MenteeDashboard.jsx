import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  User,
  Target,
  CheckSquare,
  Calendar,
  Clock,
  MessageSquare,
  Star,
  Award,
  CheckCircle2,
  AlertCircle,
  ChevronDown
} from 'lucide-react';

export default function MenteeDashboard({ onOpenFeedbackModal, onOpenCheckin }) {
  const { currentUser } = useApp();
  const [relationship, setRelationship] = useState(null);
  const [goals, setGoals] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [actionItems, setActionItems] = useState([]);

  useEffect(() => {
    if (currentUser) {
      fetchMenteeData();
    }
  }, [currentUser]);

  const fetchMenteeData = async () => {
    try {
      // Fetch relationship
      const relRes = await fetch(`/api/relationships?user_id=${currentUser.id}&role=mentee`);
      const relData = await relRes.json();
      if (relData.length > 0) {
        setRelationship(relData[0]);

        // Fetch goals
        const goalsRes = await fetch(`/api/goals?relationship_id=${relData[0].id}`);
        const goalsData = await goalsRes.json();
        setGoals(goalsData);
      }

      // Fetch sessions
      const sessRes = await fetch(`/api/sessions?user_id=${currentUser.id}`);
      const sessData = await sessRes.json();
      setSessions(sessData);

      // Fetch assigned action items
      const actRes = await fetch(`/api/moms/action-items?assignee_id=${currentUser.id}`);
      const actData = await actRes.json();
      setActionItems(actData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleMilestone = async (goalId, milestoneId) => {
    try {
      await fetch(`/api/goals/${goalId}/milestones/${milestoneId}/toggle`, { method: 'PUT' });
      fetchMenteeData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleActionItem = async (itemId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await fetch(`/api/moms/action-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchMenteeData();
    } catch (e) {
      console.error(e);
    }
  };

  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Mentor Overview Card */}
      {relationship ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <img
              src={relationship.mentor_avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
              alt={relationship.mentor_name}
              className="w-16 h-16 rounded-full border-2 border-blue-500 object-cover shadow-sm"
            />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Assigned Mentor</div>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">{relationship.mentor_name}</h2>
              <p className="text-xs text-slate-500">{relationship.mentor_department} • Program: {relationship.program_name}</p>
              <div className="mt-2 flex items-center space-x-2 text-xs text-slate-600">
                <span className="font-semibold">Mentor Email:</span>
                <span className="text-blue-600 underline">{relationship.mentor_email}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={onOpenCheckin}
              className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-500 transition-colors flex items-center justify-center space-x-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Session Check-In</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-xs text-amber-800">
          No active mentor relationship assigned yet.
        </div>
      )}

      {/* Main Grid: Goals & Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals & Milestones (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800 flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span>My Mentorship Goals & Milestones</span>
            </h2>
          </div>

          <div className="p-4 space-y-4">
            {goals.length === 0 ? (
              <div className="text-xs text-slate-500 italic">No goals defined yet.</div>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900 text-sm">{goal.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          goal.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          goal.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          goal.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {goal.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{goal.description}</p>
                      <div className="text-[11px] text-slate-400 mt-1">Target Date: {goal.target_date || 'N/A'}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-blue-600">{goal.progress_percentage}%</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${goal.progress_percentage}%` }}
                    />
                  </div>

                  {/* Milestones Checklist */}
                  <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                    <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Milestones</div>
                    {goal.milestones?.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleToggleMilestone(goal.id, m.id)}
                        className="flex items-center space-x-2 cursor-pointer text-xs text-slate-700 hover:text-slate-900 select-none"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(m.is_completed)}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className={m.is_completed ? 'line-through text-slate-400' : 'font-medium'}>
                          {m.title}
                        </span>
                        {m.target_date && <span className="text-[10px] text-slate-400">({m.target_date})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Assigned Action Items & Feedback (1 col) */}
        <div className="space-y-6">
          {/* Action Items List */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>Assigned Action Items</span>
            </h3>

            <div className="space-y-2">
              {actionItems.length === 0 ? (
                <div className="text-xs text-slate-500 italic">No assigned action items.</div>
              ) : (
                actionItems.map((item) => (
                  <div key={item.id} className="p-3 border border-slate-200 rounded bg-slate-50 text-xs">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2">
                        <input
                          type="checkbox"
                          checked={item.status === 'completed'}
                          onChange={() => handleToggleActionItem(item.id, item.status)}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className={`font-semibold text-slate-800 ${item.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                            {item.title}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                          {item.deadline && (
                            <span className="text-[10px] text-slate-400 mt-1 block">Deadline: {item.deadline}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        item.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Post-Session Feedback Prompt */}
          <div className="bg-blue-900 text-white p-5 rounded-lg shadow-sm border border-blue-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-200 flex items-center space-x-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Session Feedback</span>
            </h3>
            <p className="text-xs text-blue-100 mt-1">
              Have you recently met with your mentor? Submit feedback to help track session outcome.
            </p>
            {completedSessions.length > 0 && (
              <button
                onClick={() => onOpenFeedbackModal(completedSessions[0])}
                className="mt-3 w-full py-2 bg-amber-500 hover:bg-amber-400 font-semibold rounded text-xs text-slate-900 transition-colors flex items-center justify-center space-x-1"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Submit Post-Session Feedback</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
