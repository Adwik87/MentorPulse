const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Get sessions with filters (relationship_id, user_id, status, start_date, end_date)
router.get('/', (req, res) => {
  const { relationship_id, user_id, status, start_date, end_date } = req.query;
  let query = `
    SELECT s.*,
           r.mentor_id, r.mentee_id,
           m.name as mentor_name, e.name as mentee_name
    FROM sessions s
    JOIN relationships r ON s.relationship_id = r.id
    JOIN users m ON r.mentor_id = m.id
    JOIN users e ON r.mentee_id = e.id
    WHERE 1=1
  `;
  const params = [];

  if (relationship_id) {
    query += ' AND s.relationship_id = ?';
    params.push(relationship_id);
  }

  if (user_id) {
    query += ' AND (r.mentor_id = ? OR r.mentee_id = ?)';
    params.push(user_id, user_id);
  }

  if (status) {
    query += ' AND s.status = ?';
    params.push(status);
  }

  if (start_date) {
    query += ' AND s.scheduled_start >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND s.scheduled_end <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY s.scheduled_start ASC';

  const sessions = db.prepare(query).all(...params);
  res.json(sessions);
});

// Get session details including attendance, MoM, and feedback
router.get('/:id', (req, res) => {
  const session = db.prepare(`
    SELECT s.*,
           r.mentor_id, r.mentee_id,
           m.name as mentor_name, m.email as mentor_email,
           e.name as mentee_name, e.email as mentee_email
    FROM sessions s
    JOIN relationships r ON s.relationship_id = r.id
    JOIN users m ON r.mentor_id = m.id
    JOIN users e ON r.mentee_id = e.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!session) return res.status(404).json({ error: 'Session not found' });

  const attendance = db.prepare(`
    SELECT a.*, u.name as user_name, u.role as user_role
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE a.session_id = ?
  `).all(req.params.id);

  const mom = db.prepare('SELECT * FROM moms WHERE session_id = ?').get(req.params.id);

  let actionItems = [];
  if (mom) {
    actionItems = db.prepare(`
      SELECT ai.*, u.name as assignee_name
      FROM action_items ai
      JOIN users u ON ai.assignee_id = u.id
      WHERE ai.mom_id = ?
    `).all(mom.id);
  }

  const feedback = db.prepare('SELECT * FROM mentee_feedback WHERE session_id = ?').get(req.params.id);

  res.json({
    ...session,
    attendance,
    mom: mom ? { ...mom, action_items: actionItems } : null,
    feedback
  });
});

// Schedule new mentoring session
router.post('/', (req, res) => {
  const { relationship_id, title, description, scheduled_start, scheduled_end, location, meeting_type } = req.body;
  if (!relationship_id || !title || !scheduled_start || !scheduled_end) {
    return res.status(400).json({ error: 'relationship_id, title, scheduled_start, and scheduled_end are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO sessions (relationship_id, title, description, scheduled_start, scheduled_end, location, meeting_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')
    `);
    const info = stmt.run(relationship_id, title, description || '', scheduled_start, scheduled_end, location || 'Online', meeting_type || 'In-Person');
    const sessionId = info.lastInsertRowid;

    const rel = db.prepare('SELECT mentor_id, mentee_id FROM relationships WHERE id = ?').get(relationship_id);

    // Create notifications for mentor & mentee
    if (rel) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'New Session Scheduled', ?, 'session')
      `).run(rel.mentor_id, `Session "${title}" scheduled for ${scheduled_start}.`);

      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'New Session Scheduled', ?, 'session')
      `).run(rel.mentee_id, `Session "${title}" scheduled for ${scheduled_start}.`);
    }

    // Activity timeline
    db.prepare(`
      INSERT INTO activity_timeline (relationship_id, type, title, description)
      VALUES (?, 'session', 'Session Scheduled', ?)
    `).run(relationship_id, `Scheduled session: ${title}`);

    res.status(201).json({ id: sessionId, title, relationship_id, status: 'scheduled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update session status or details
router.put('/:id', (req, res) => {
  const { title, description, scheduled_start, scheduled_end, location, meeting_type, status } = req.body;
  try {
    db.prepare(`
      UPDATE sessions
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          scheduled_start = COALESCE(?, scheduled_start),
          scheduled_end = COALESCE(?, scheduled_end),
          location = COALESCE(?, location),
          meeting_type = COALESCE(?, meeting_type),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(title, description, scheduled_start, scheduled_end, location, meeting_type, status, req.params.id);

    res.json({ message: 'Session updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
