const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Activity Timeline
router.get('/timeline', (req, res) => {
  const { relationship_id, user_id, limit } = req.query;
  let query = `
    SELECT t.*, u.name as user_name, u.role as user_role
    FROM activity_timeline t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (relationship_id) {
    query += ' AND t.relationship_id = ?';
    params.push(relationship_id);
  }
  if (user_id) {
    query += ' AND t.user_id = ?';
    params.push(user_id);
  }

  query += ' ORDER BY t.created_at DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit, 10));
  } else {
    query += ' LIMIT 50';
  }

  const timeline = db.prepare(query).all(...params);
  res.json(timeline);
});

// Notifications GET
router.get('/notifications', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(user_id);
  const unreadCount = db.prepare('SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(user_id).count;

  res.json({ notifications: notifs, unread_count: unreadCount });
});

// Mark Notification Read
router.put('/notifications/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Notification marked as read' });
});

// Mark All Notifications Read
router.put('/notifications/read-all', (req, res) => {
  const { user_id } = req.body;
  if (user_id) {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(user_id);
  }
  res.json({ message: 'All notifications marked as read' });
});

// Audit History
router.get('/audit', (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
  res.json(logs);
});

// Coordinator & Admin Detailed Overview Analytics
router.get('/coordinator-overview', (req, res) => {
  const totalRelationships = db.prepare('SELECT COUNT(*) as count FROM relationships').get().count;
  const activeRelationships = db.prepare("SELECT COUNT(*) as count FROM relationships WHERE status = 'active'").get().count;
  const inactiveRelationships = db.prepare("SELECT COUNT(*) as count FROM relationships WHERE status = 'inactive' OR status = 'paused'").get().count;
  const flaggedHealth = db.prepare("SELECT COUNT(*) as count FROM relationships WHERE health_status IN ('needs_attention', 'at_risk')").get().count;

  const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
  const completedSessions = db.prepare("SELECT COUNT(*) as count FROM sessions WHERE status = 'completed'").get().count;
  const missedSessions = db.prepare("SELECT COUNT(*) as count FROM sessions WHERE status = 'missed'").get().count;

  const totalGoals = db.prepare('SELECT COUNT(*) as count FROM goals').get().count;
  const completedGoals = db.prepare("SELECT COUNT(*) as count FROM goals WHERE status = 'completed'").get().count;
  const overdueGoals = db.prepare("SELECT COUNT(*) as count FROM goals WHERE status = 'overdue'").get().count;

  const totalAttendanceRecords = db.prepare('SELECT COUNT(*) as count FROM attendance').get().count;
  const verifiedLocationCount = db.prepare('SELECT COUNT(*) as count FROM attendance WHERE is_location_verified = 1').get().count;

  const attendancePercentage = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 100;
  const goalCompletionPercentage = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // List of flagged / at-risk relationships
  const flaggedList = db.prepare(`
    SELECT r.*,
           m.name as mentor_name, e.name as mentee_name
    FROM relationships r
    JOIN users m ON r.mentor_id = m.id
    JOIN users e ON r.mentee_id = e.id
    WHERE r.health_status IN ('needs_attention', 'at_risk') OR r.status = 'inactive'
  `).all();

  res.json({
    metrics: {
      total_relationships: totalRelationships,
      active_relationships: activeRelationships,
      inactive_relationships: inactiveRelationships,
      flagged_health: flaggedHealth,
      total_sessions: totalSessions,
      completed_sessions: completedSessions,
      missed_sessions: missedSessions,
      attendance_percentage: attendancePercentage,
      total_goals: totalGoals,
      completed_goals: completedGoals,
      overdue_goals: overdueGoals,
      goal_completion_percentage: goalCompletionPercentage,
      verified_location_count: verifiedLocationCount
    },
    flagged_relationships: flaggedList
  });
});

// Report Export - Generate CSV string
router.get('/export/csv', (req, res) => {
  const { type } = req.query; // 'relationships', 'sessions', 'goals', 'attendance'

  let csvContent = '';

  if (type === 'sessions') {
    const rows = db.prepare(`
      SELECT s.id, s.title, s.scheduled_start, s.scheduled_end, s.status, s.meeting_type, s.location,
             m.name as mentor, e.name as mentee
      FROM sessions s
      JOIN relationships r ON s.relationship_id = r.id
      JOIN users m ON r.mentor_id = m.id
      JOIN users e ON r.mentee_id = e.id
    `).all();

    csvContent = 'Session ID,Title,Mentor,Mentee,Scheduled Start,Status,Meeting Type,Location\n';
    rows.forEach(r => {
      csvContent += `"${r.id}","${r.title}","${r.mentor}","${r.mentee}","${r.scheduled_start}","${r.status}","${r.meeting_type}","${r.location}"\n`;
    });
  } else if (type === 'goals') {
    const rows = db.prepare(`
      SELECT g.id, g.title, g.category, g.target_date, g.status, g.progress_percentage,
             u.name as mentee
      FROM goals g
      JOIN users u ON g.mentee_id = u.id
    `).all();

    csvContent = 'Goal ID,Title,Mentee,Category,Target Date,Status,Progress (%)\n';
    rows.forEach(r => {
      csvContent += `"${r.id}","${r.title}","${r.mentee}","${r.category}","${r.target_date || ''}","${r.status}","${r.progress_percentage}"\n`;
    });
  } else {
    // Default relationships export
    const rows = db.prepare(`
      SELECT r.id, r.program_name, r.status, r.health_status, r.start_date, r.last_interaction_date,
             m.name as mentor, e.name as mentee
      FROM relationships r
      JOIN users m ON r.mentor_id = m.id
      JOIN users e ON r.mentee_id = e.id
    `).all();

    csvContent = 'Relationship ID,Program,Mentor,Mentee,Status,Health Status,Start Date,Last Interaction\n';
    rows.forEach(r => {
      csvContent += `"${r.id}","${r.program_name}","${r.mentor}","${r.mentee}","${r.status}","${r.health_status}","${r.start_date || ''}","${r.last_interaction_date || ''}"\n`;
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=mentorpulse_${type || 'overview'}.csv`);
  res.status(200).send(csvContent);
});

module.exports = router;
