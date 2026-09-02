import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, X, Clock, MapPin, Video } from 'lucide-react';

export default function ScheduleModal({ onClose, onSuccess }) {
  const { currentUser } = useApp();
  const [relationships, setRelationships] = useState([]);
  const [selectedRelId, setSelectedRelId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [meetingType, setMeetingType] = useState('In-Person');
  const [location, setLocation] = useState('Science Building Room 402');

  useEffect(() => {
    if (currentUser) {
      fetchRelationships();
    }
  }, [currentUser]);

  const fetchRelationships = async () => {
    try {
      const res = await fetch(`/api/relationships?user_id=${currentUser.id}`);
      const data = await res.json();
      setRelationships(data);
      if (data.length > 0) setSelectedRelId(data[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRelId || !title || !startDate) return;

    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationship_id: selectedRelId,
          title,
          description,
          scheduled_start: startDate.replace('T', ' '),
          scheduled_end: startDate.replace('T', ' '),
          location,
          meeting_type: meetingType
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
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Schedule Mentoring Session</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Mentorship Relationship</label>
            <select
              value={selectedRelId}
              onChange={(e) => setSelectedRelId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-medium"
            >
              {relationships.map(r => (
                <option key={r.id} value={r.id}>
                  {r.mentor_name} & {r.mentee_name} ({r.program_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Session Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Mid-semester Progress Review & Career Advice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Agenda / Description</label>
            <textarea
              rows="2"
              placeholder="Key topics to cover..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Meeting Type</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-medium"
              >
                <option value="In-Person">In-Person</option>
                <option value="Virtual">Virtual Zoom</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Location / Link</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded"
              />
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
              Schedule Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
