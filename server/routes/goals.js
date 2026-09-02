const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Helper to update goal status & calculated progress based on milestones
function recalculateGoalProgress(goalId) {
  const milestones = db.prepare('SELECT * FROM milestones WHERE goal_id = ?').all(goalId);
  if (milestones.length === 0) return;

  const completedCount = milestones.filter(m => m.is_completed).length;
  const progress = Math.round((completedCount / milestones.length) * 100);

  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId);
  let status = goal.status;
  if (progress === 100) {
    status = 'completed';
  } else if (progress > 0 && status !== 'overdue') {
    status = 'in_progress';
  }

  // Check if overdue
  if (goal.target_date && new Date(goal.target_date) < new Date() && status !== 'completed') {
    status = 'overdue';
  }

  db.prepare(`
    UPDATE goals
    SET progress_percentage = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(progress, status, goalId);
}

// Get goals with filtering (relationship_id, mentee_id, status)
router.get('/', (req, res) => {
  const { relationship_id, mentee_id, status } = req.query;
  let query = 'SELECT * FROM goals WHERE 1=1';
  const params = [];

  if (relationship_id) {
    query += ' AND relationship_id = ?';
    params.push(relationship_id);
  }
  if (mentee_id) {
    query += ' AND mentee_id = ?';
    params.push(mentee_id);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const goals = db.prepare(query).all(...params);

  // Attach milestones to each goal
  const getMilestones = db.prepare('SELECT * FROM milestones WHERE goal_id = ? ORDER BY id ASC');
  const goalsWithMilestones = goals.map(g => ({
    ...g,
    milestones: getMilestones.all(g.id)
  }));

  res.json(goalsWithMilestones);
});

// Get single goal with milestones
router.get('/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const milestones = db.prepare('SELECT * FROM milestones WHERE goal_id = ? ORDER BY id ASC').all(req.params.id);
  res.json({ ...goal, milestones });
});

// Create Goal with optional Milestones
router.post('/', (req, res) => {
  const { relationship_id, mentee_id, title, description, category, target_date, milestones } = req.body;
  if (!relationship_id || !mentee_id || !title) {
    return res.status(400).json({ error: 'relationship_id, mentee_id, and title are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO goals (relationship_id, mentee_id, title, description, category, target_date, status, progress_percentage)
      VALUES (?, ?, ?, ?, ?, ?, 'not_started', 0)
    `);
    const info = stmt.run(relationship_id, mentee_id, title, description || '', category || 'Academic', target_date || null);
    const goalId = info.lastInsertRowid;

    if (Array.isArray(milestones) && milestones.length > 0) {
      const insertM = db.prepare(`
        INSERT INTO milestones (goal_id, title, target_date, is_completed)
        VALUES (?, ?, ?, 0)
      `);
      for (const m of milestones) {
        if (m.title) insertM.run(goalId, m.title, m.target_date || null);
      }
      recalculateGoalProgress(goalId);
    }

    // Log Activity
    db.prepare(`
      INSERT INTO activity_timeline (relationship_id, user_id, type, title, description)
      VALUES (?, ?, 'goal', 'Goal Created', ?)
    `).run(relationship_id, mentee_id, `Goal added: ${title}`);

    res.status(201).json({ id: goalId, title, relationship_id, mentee_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Goal Status or Details
router.put('/:id', (req, res) => {
  const { title, description, category, target_date, status, progress_percentage } = req.body;
  try {
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    db.prepare(`
      UPDATE goals
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          target_date = COALESCE(?, target_date),
          status = COALESCE(?, status),
          progress_percentage = COALESCE(?, progress_percentage),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, description, category, target_date, status, progress_percentage, req.params.id);

    res.json({ message: 'Goal updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Milestone completion
router.put('/:goalId/milestones/:milestoneId/toggle', (req, res) => {
  const { goalId, milestoneId } = req.params;
  try {
    const ms = db.prepare('SELECT * FROM milestones WHERE id = ? AND goal_id = ?').get(milestoneId, goalId);
    if (!ms) return res.status(404).json({ error: 'Milestone not found' });

    const newCompleted = ms.is_completed ? 0 : 1;
    const completedAt = newCompleted ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE milestones
      SET is_completed = ?, completed_at = ?
      WHERE id = ?
    `).run(newCompleted, completedAt, milestoneId);

    recalculateGoalProgress(goalId);

    res.json({ message: 'Milestone updated', is_completed: newCompleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Milestone to Goal
router.post('/:goalId/milestones', (req, res) => {
  const { title, target_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const stmt = db.prepare(`
      INSERT INTO milestones (goal_id, title, target_date, is_completed)
      VALUES (?, ?, ?, 0)
    `);
    const info = stmt.run(req.params.goalId, title, target_date || null);
    recalculateGoalProgress(req.params.goalId);

    res.status(201).json({ id: info.lastInsertRowid, title, is_completed: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
