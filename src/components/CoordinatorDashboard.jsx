import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  AlertTriangle,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  FileSpreadsheet,
  ShieldAlert,
  Search,
  Filter
} from 'lucide-react';

export default function CoordinatorDashboard() {
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [healthFilter, setHealthFilter] = useState('all');

  useEffect(() => {
    fetchCoordinatorData();
  }, []);

  const fetchCoordinatorData = async () => {
    try {
      const res = await fetch('/api/analytics/coordinator-overview');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = (type) => {
    window.open(`/api/analytics/export/csv?type=${type}`, '_blank');
  };

  const handleUpdateHealth = async (relId, newHealth) => {
    try {
      await fetch(`/api/relationships/${relId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ health_status: newHealth })
      });
      fetchCoordinatorData();
    } catch (e) {
      console.error(e);
    }
  };

  if (!data) return <div className="p-6 text-xs text-slate-500">Loading coordinator overview...</div>;

  const { metrics, flagged_relationships } = data;

  const filteredRelationships = flagged_relationships.filter(r => {
    const matchesSearch = r.mentor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.mentee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.program_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHealth = healthFilter === 'all' || r.health_status === healthFilter;
    return matchesSearch && matchesHealth;
  });

  return (
    <div className="space-y-6">
      {/* Overview Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Partnerships</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{metrics.total_relationships}</div>
          <div className="text-[11px] text-slate-500 mt-1">{metrics.active_relationships} Active • {metrics.inactive_relationships} Inactive</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Session Attendance Rate</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{metrics.attendance_percentage}%</div>
          <div className="text-[11px] text-slate-500 mt-1">{metrics.completed_sessions} Completed / {metrics.total_sessions} Total</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Goal Completion Rate</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{metrics.goal_completion_percentage}%</div>
          <div className="text-[11px] text-slate-500 mt-1">{metrics.completed_goals} Completed / {metrics.overdue_goals} Overdue</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Flagged / At-Risk</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{metrics.flagged_health}</div>
          <div className="text-[11px] text-slate-500 mt-1">Requires coordinator intervention</div>
        </div>
      </div>

      {/* CSV Reports & Exports Section */}
      <div className="bg-slate-900 text-white rounded-lg p-5 shadow-sm border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Institutional Mentorship Reports Export</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Download comprehensive tabular reports for accreditation audits and departmental evaluations.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExportCSV('relationships')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded border border-slate-700 flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Relationships CSV</span>
          </button>
          <button
            onClick={() => handleExportCSV('sessions')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded border border-slate-700 flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sessions CSV</span>
          </button>
          <button
            onClick={() => handleExportCSV('goals')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded border border-slate-700 flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Goals CSV</span>
          </button>
        </div>
      </div>

      {/* Flagged & Inactive Relationships Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-800 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Flagged & Attention-Required Relationships</span>
          </h2>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search mentor or mentee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="py-1.5 px-2 text-xs border border-slate-300 rounded bg-slate-50 font-medium"
            >
              <option value="all">All Health Ratings</option>
              <option value="at_risk">At Risk</option>
              <option value="needs_attention">Needs Attention</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-left">
              <tr>
                <th className="px-4 py-3">Mentor</th>
                <th className="px-4 py-3">Mentee</th>
                <th className="px-4 py-3">Program</th>
                <th className="px-4 py-3">Health Status</th>
                <th className="px-4 py-3">Last Interaction</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRelationships.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-slate-500 italic">
                    No flagged relationships matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRelationships.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.mentor_name}</td>
                    <td className="px-4 py-3 text-slate-700">{r.mentee_name}</td>
                    <td className="px-4 py-3 text-slate-500">{r.program_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 font-bold rounded text-[10px] uppercase ${
                        r.health_status === 'at_risk' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.health_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.last_interaction_date ? new Date(r.last_interaction_date).toLocaleDateString() : 'None'}</td>
                    <td className="px-4 py-3 text-right">
                      <select
                        value={r.health_status}
                        onChange={(e) => handleUpdateHealth(r.id, e.target.value)}
                        className="py-1 px-2 border border-slate-300 rounded text-[11px] bg-slate-50 font-medium"
                      >
                        <option value="good">Set Good</option>
                        <option value="excellent">Set Excellent</option>
                        <option value="needs_attention">Set Needs Attention</option>
                        <option value="at_risk">Set At Risk</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
