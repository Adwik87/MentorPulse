const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Get all users (optional role filter)
router.get('/', (req, res) => {
  const { role } = req.query;
  let query = 'SELECT * FROM users';
  let params = [];
  if (role) {
    query += ' WHERE role = ?';
    params.push(role);
  }
  query += ' ORDER BY name ASC';
  const users = db.prepare(query).all(...params);
  res.json(users);
});

// Get user by ID
router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Create new user
router.post('/', (req, res) => {
  const { name, email, role, department, academic_year, professional_title, interests, goals_summary, bio, avatar_url } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO users (name, email, role, department, academic_year, professional_title, interests, goals_summary, bio, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, email, role, department || null, academic_year || null, professional_title || null, interests || null, goals_summary || null, bio || null, avatar_url || null);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (user_name, action, target_type, target_id, details)
      VALUES ('System Admin', 'USER_CREATED', 'user', ?, ?)
    `).run(info.lastInsertRowid, `Created user ${name} (${role})`);

    res.status(201).json({ id: info.lastInsertRowid, name, email, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
router.put('/:id', (req, res) => {
  const { name, email, department, academic_year, professional_title, interests, goals_summary, bio, avatar_url } = req.body;
  try {
    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          department = COALESCE(?, department),
          academic_year = COALESCE(?, academic_year),
          professional_title = COALESCE(?, professional_title),
          interests = COALESCE(?, interests),
          goals_summary = COALESCE(?, goals_summary),
          bio = COALESCE(?, bio),
          avatar_url = COALESCE(?, avatar_url)
      WHERE id = ?
    `).run(name, email, department, academic_year, professional_title, interests, goals_summary, bio, avatar_url, req.params.id);

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
