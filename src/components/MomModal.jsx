import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Plus, Trash2, X, CheckCircle2 } from 'lucide-react';

export default function MomModal({ session, onClose, onSuccess }) {
  const { currentUser } = useApp();
  const [discussionPoints, setDiscussionPoints] = useState('');
  const [decisions, setDecisions] = useState('');
  const [observations, setObservations] = useState('');
  const [followUps, setFollowUps] = useState('');
  const [actionItems, setActionItems] = useState([
    { title: '', description: '', assignee_id: session?.mentee_id || '', deadline: '', priority: 'medium' }
  ]);

  const handleAddActionItem = () => {
    setActionItems([
      ...actionItems,
      { title: '', description: '', assignee_id: session?.mentee_id || '', deadline: '', priority: 'medium' }
    ]);
  };

  const handleRemoveActionItem = (index) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const handleActionChange = (index, field, value) => {
    const updated = [...actionItems];
    updated[index][field] = value;
    setActionItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) return;

    try {
      await fetch('/api/moms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          discussion_points: discussionPoints,
          decisions: decisions,
          observations: observations,
          follow_ups: followUps,
          created_by: currentUser?.id,
          action_items: actionItems.filter(ai => ai.title)
        })
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Meeting Minutes (MoM) & Action Items</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Session: {session?.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Key Discussion Points</label>
            <textarea
              rows="2"
              placeholder="Outline topics covered in the session..."
              value={discussionPoints}
              onChange={(e) => setDiscussionPoints(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Agreed Decisions</label>
              <textarea
                rows="2"
                placeholder="Decisions reached..."
                value={decisions}
                onChange={(e) => setDecisions(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mentor Observations</label>
              <textarea
                rows="2"
                placeholder="Growth areas, strengths..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Follow-up Notes</label>
            <input
              type="text"
              placeholder="Next meeting plan..."
              value={followUps}
              onChange={(e) => setFollowUps(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Action Items Section */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Action Items Created</span>
              <button
                type="button"
                onClick={handleAddActionItem}
                className="text-xs text-blue-600 font-semibold hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {actionItems.map((item, idx) => (
                <div key={idx} className="p-3 border border-slate-200 rounded bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Action Item #{idx + 1}</span>
                    {actionItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveActionItem(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Action Title (e.g., Complete Chapter 3 outline)"
                    value={item.title}
                    onChange={(e) => handleActionChange(idx, 'title', e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Deadline</label>
                      <input
                        type="date"
                        value={item.deadline}
                        onChange={(e) => handleActionChange(idx, 'deadline', e.target.value)}
                        className="w-full p-1 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Priority</label>
                      <select
                        value={item.priority}
                        onChange={(e) => handleActionChange(idx, 'priority', e.target.value)}
                        className="w-full p-1 border border-slate-300 rounded bg-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded font-semibold hover:bg-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-500"
            >
              Save MoM & Action Items
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
