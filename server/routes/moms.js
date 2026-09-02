const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Create or update MoM for a session
router.post('/', (req, res) => {
  const { session_id, discussion_points, decisions, observations, follow_ups, created_by, action_items } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });

  try {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    let mom = db.prepare('SELECT * FROM moms WHERE session_id = ?').get(session_id);
    let momId;

    if (mom) {
      db.prepare(`
        UPDATE moms
        SET discussion_points = ?, decisions = ?, observations = ?, follow_ups = ?, created_by = ?
        WHERE id = ?
      `).run(discussion_points || '', decisions || '', observations || '', follow_ups || '', created_by || null, mom.id);
      momId = mom.id;
    } else {
      const info = db.prepare(`
        INSERT INTO moms (session_id, discussion_points, decisions, observations, follow_ups, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(session_id, discussion_points || '', decisions || '', observations || '', follow_ups || '', created_by || null);
      momId = info.lastInsertRowid;
    }

    // Mark session as completed when MoM is submitted
    db.prepare(`UPDATE sessions SET status = 'completed' WHERE id = ?`).run(session_id);

    // Create Action Items if provided
    if (Array.isArray(action_items) && action_items.length > 0) {
      const insertAction = db.prepare(`
        INSERT INTO action_items (mom_id, relationship_id, title, description, assignee_id, deadline, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `);

      for (const item of action_items) {
        if (item.title && item.assignee_id) {
          insertAction.run(
            momId,
            session.relationship_id,
            item.title,
            item.description || '',
            item.assignee_id,
            item.deadline || null,
            item.priority || 'medium'
          );

          // Create notification for assignee
          db.prepare(`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (?, 'New Action Item Assigned', ?, 'action_item')
          `).run(item.assignee_id, `You were assigned action item: "${item.title}".`);
        }
      }
    }

    // Activity log
    db.prepare(`
      INSERT INTO activity_timeline (relationship_id, user_id, type, title, description)
      VALUES (?, ?, 'mom', 'Meeting Minutes Recorded', ?)
    `).run(session.relationship_id, created_by || null, `MoM saved for session "${session.title}".`);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, user_name, action, target_type, target_id, details)
      VALUES (?, 'User', 'CREATE_MOM', 'session', ?, ?)
    `).run(created_by || null, session_id, `Created Meeting Minutes for session ID ${session_id}`);

    res.status(201).json({ id: momId, session_id, message: 'MoM and Action Items saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Action Items GET route
router.get('/action-items', (req, res) => {
  const { relationship_id, assignee_id, status } = req.query;
  let query = `
    SELECT ai.*, u.name as assignee_name, r.mentor_id, r.mentee_id
    FROM action_items ai
    JOIN users u ON ai.assignee_id = u.id
    JOIN relationships r ON ai.relationship_id = r.id
    WHERE 1=1
  `;
  const params = [];

  if (relationship_id) {
    query += ' AND ai.relationship_id = ?';
    params.push(relationship_id);
  }
  if (assignee_id) {
    query += ' AND ai.assignee_id = ?';
    params.push(assignee_id);
  }
  if (status) {
    query += ' AND ai.status = ?';
    params.push(status);
  }

  query += ' ORDER BY ai.deadline ASC';

  const items = db.prepare(query).all(...params);
  res.json(items);
});

// Action Item toggle/status update
router.put('/action-items/:id', (req, res) => {
  const { status } = req.body;
  try {
    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    db.prepare(`
      UPDATE action_items
      SET status = ?, completed_at = ?
      WHERE id = ?
    `).run(status, completedAt, req.params.id);

    res.json({ message: 'Action item status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mentor Private Notes CRUD
router.get('/notes', (req, res) => {
  const { relationship_id, mentor_id } = req.query;
  let query = 'SELECT n.*, u.name as mentee_name FROM mentor_notes n JOIN users u ON n.mentee_id = u.id WHERE 1=1';
  const params = [];

  if (relationship_id) {
    query += ' AND n.relationship_id = ?';
    params.push(relationship_id);
  }
  if (mentor_id) {
    query += ' AND n.mentor_id = ?';
    params.push(mentor_id);
  }

  query += ' ORDER BY n.created_at DESC';

  const notes = db.prepare(query).all(...params);
  res.json(notes);
});

router.post('/notes', (req, res) => {
  const { relationship_id, mentor_id, mentee_id, note, is_private } = req.body;
  if (!relationship_id || !mentor_id || !mentee_id || !note) {
    return res.status(400).json({ error: 'relationship_id, mentor_id, mentee_id, and note are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO mentor_notes (relationship_id, mentor_id, mentee_id, note, is_private)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(relationship_id, mentor_id, mentee_id, note, is_private !== undefined ? (is_private ? 1 : 0) : 1);

    res.status(201).json({ id: info.lastInsertRowid, note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mentee Feedback
router.post('/feedback', (req, res) => {
  const { session_id, mentee_id, rating, feedback_text } = req.body;
  if (!session_id || !mentee_id || !rating) {
    return res.status(400).json({ error: 'session_id, mentee_id, and rating are required' });
  }

  try {
    db.prepare(`
      INSERT INTO mentee_feedback (session_id, mentee_id, rating, feedback_text)
      VALUES (?, ?, ?, ?)
    `).run(session_id, mentee_id, rating, feedback_text || '');

    const session = db.prepare('SELECT relationship_id, title FROM sessions WHERE id = ?').get(session_id);
    if (session) {
      const rel = db.prepare('SELECT mentor_id FROM relationships WHERE id = ?').get(session.relationship_id);
      if (rel) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, 'Mentee Feedback Received', ?, 'system')
        `).run(rel.mentor_id, `Feedback (${rating}/5 stars) submitted for session "${session.title}".`);
      }
    }

    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
