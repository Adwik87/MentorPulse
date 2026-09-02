import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Camera, MapPin, CheckCircle2, X, AlertCircle, ShieldCheck } from 'lucide-react';

export default function CheckinModal({ onClose, onSuccess }) {
  const { currentUser } = useApp();
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
      if (data.length > 0) setSelectedSessionId(data[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSessionId || !currentUser) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('session_id', selectedSessionId);
    formData.append('user_id', currentUser.id);
    formData.append('notes', notes);
    if (photo) {
      formData.append('photo', photo);
    }

    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setResult(data);
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Camera className="w-5 h-5 text-emerald-600" />
            <span>Session Check-In & Location Evidence</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Check-in Verified & Recorded!</span>
              </div>
              <p>Timestamp: {new Date(result.check_in_time).toLocaleString()}</p>

              {result.is_location_verified ? (
                <div className="p-2 bg-emerald-100 rounded flex items-center space-x-2 text-emerald-800 font-semibold mt-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>EXIF Geolocation Verified: Lat {result.photo_lat?.toFixed(4)}, Lng {result.photo_lng?.toFixed(4)}</span>
                </div>
              ) : (
                <div className="p-2 bg-amber-100 rounded text-amber-800 font-medium mt-2">
                  Check-in logged without photo EXIF GPS location metadata.
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2 bg-slate-800 text-white font-semibold rounded text-xs hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Session</label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-medium"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.scheduled_start})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Upload Photo Evidence (preserves EXIF GPS)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full p-2 border border-slate-300 rounded text-xs"
              />
              {previewUrl && (
                <div className="mt-2 relative rounded border border-slate-200 overflow-hidden max-h-36">
                  <img src={previewUrl} alt="Preview" className="w-full h-36 object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Location Notes / Observations</label>
              <textarea
                rows="2"
                placeholder="Met in Library Room 304..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
              />
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
                disabled={loading}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Submit Check-In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
