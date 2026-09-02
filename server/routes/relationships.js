const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Get relationships with query parameters (user_id, role, status, health_status)
router.get('/', (req, res) => {
  const { user_id, role, status, health_status } = req.query;
  let query = `
    SELECT r.*,
           m.name as mentor_name, m.email as mentor_email, m.department as mentor_department, m.avatar_url as mentor_avatar,
           e.name as mentee_name, e.email as mentee_email, e.department as mentee_department, e.academic_year as mentee_year, e.interests as mentee_interests, e.avatar_url as mentee_avatar
    FROM relationships r
    JOIN users m ON r.mentor_id = m.id
    JOIN users e ON r.mentee_id = e.id
    WHERE 1=1
  `;
  const params = [];

  if (user_id && role === 'mentor') {
    query += ' AND r.mentor_id = ?';
    params.push(user_id);
  } else if (user_id && role === 'mentee') {
    query += ' AND r.mentee_id = ?';
    params.push(user_id);
  } else if (user_id) {
    query += ' AND (r.mentor_id = ? OR r.mentee_id = ?)';
    params.push(user_id, user_id);
  }

  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }

  if (health_status) {
    query += ' AND r.health_status = ?';
    params.push(health_status);
  }

  query += ' ORDER BY r.created_at DESC';

  const relationships = db.prepare(query).all(...params);
  res.json(relationships);
});

// Get single relationship with detailed stats
router.get('/:id', (req, res) => {
  const rel = db.prepare(`
    SELECT r.*,
           m.name as mentor_name, m.email as mentor_email, m.department as mentor_department, m.avatar_url as mentor_avatar, m.professional_title as mentor_title,
           e.name as mentee_name, e.email as mentee_email, e.department as mentee_department, e.academic_year as mentee_year, e.interests as mentee_interests, e.goals_summary as mentee_goals_summary, e.bio as mentee_bio, e.avatar_url as mentee_avatar
    FROM relationships r
    JOIN users m ON r.mentor_id = m.id
    JOIN users e ON r.mentee_id = e.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!rel) return res.status(404).json({ error: 'Relationship not found' });

  // Calculate session & attendance stats
  const sessionStats = db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed_sessions,
      SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as upcoming_sessions
    FROM sessions
    WHERE relationship_id = ?
  `).get(req.params.id);

  // Goal stats
  const goalStats = db.prepare(`
    SELECT
      COUNT(*) as total_goals,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_goals,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_goals,
      SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_goals,
      AVG(progress_percentage) as avg_progress
    FROM goals
    WHERE relationship_id = ?
  `).get(req.params.id);

  res.json({
    ...rel,
    stats: {
      sessions: sessionStats,
      goals: goalStats
    }
  });
});

// Create relationship
router.post('/', (req, res) => {
  const { mentor_id, mentee_id, program_name, start_date, end_date } = req.body;
  if (!mentor_id || !mentee_id) {
    return res.status(400).json({ error: 'mentor_id and mentee_id are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO relationships (mentor_id, mentee_id, program_name, start_date, end_date, status, health_status)
      VALUES (?, ?, ?, ?, ?, 'active', 'good')
    `);
    const info = stmt.run(mentor_id, mentee_id, program_name || 'University Mentorship 2025', start_date || new Date().toISOString().split('T')[0], end_date || null);

    const relId = info.lastInsertRowid;

    // Log Activity
    db.prepare(`
      INSERT INTO activity_timeline (relationship_id, type, title, description)
      VALUES (?, 'relationship', 'Relationship Created', 'New mentor-mentee relationship established.')
    `).run(relId);

    // Audit Log
    db.prepare(`
      INSERT INTO audit_logs (user_name, action, target_type, target_id, details)
      VALUES ('System Admin', 'RELATIONSHIP_CREATED', 'relationship', ?, ?)
    `).run(relId, `Matched Mentor ${mentor_id} with Mentee ${mentee_id}`);

    res.status(201).json({ id: relId, mentor_id, mentee_id, status: 'active', health_status: 'good' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update relationship status or health status
router.put('/:id/status', (req, res) => {
  const { status, health_status } = req.body;
  try {
    const rel = db.prepare('SELECT * FROM relationships WHERE id = ?').get(req.params.id);
    if (!rel) return res.status(404).json({ error: 'Relationship not found' });

    db.prepare(`
      UPDATE relationships
      SET status = COALESCE(?, status),
          health_status = COALESCE(?, health_status)
      WHERE id = ?
    `).run(status, health_status, req.params.id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (user_name, action, target_type, target_id, details)
      VALUES ('System Admin', 'RELATIONSHIP_UPDATED', 'relationship', ?, ?)
    `).run(req.params.id, `Updated status to ${status || rel.status}, health to ${health_status || rel.health_status}`);

    res.json({ message: 'Relationship status updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
