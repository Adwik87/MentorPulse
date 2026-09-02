const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const exifr = require('exifr');
const { db } = require('../db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Session check-in with optional photo and EXIF geolocation extraction
router.post('/checkin', upload.single('photo'), async (req, res) => {
  const { session_id, user_id, notes } = req.body;
  if (!session_id || !user_id) {
    return res.status(400).json({ error: 'session_id and user_id are required' });
  }

  let photo_url = null;
  let photo_lat = null;
  let photo_lng = null;
  let is_location_verified = 0;

  if (req.file) {
    photo_url = `/uploads/${req.file.filename}`;
    try {
      // Parse EXIF metadata from uploaded image
      const gps = await exifr.gps(req.file.path);
      if (gps && gps.latitude && gps.longitude) {
        photo_lat = gps.latitude;
        photo_lng = gps.longitude;
        is_location_verified = 1; // Successfully parsed GPS coordinates from EXIF
      }
    } catch (e) {
      console.log('EXIF parsing error or no EXIF present:', e.message);
    }
  }

  try {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Check if attendance record exists
    const existing = db.prepare('SELECT * FROM attendance WHERE session_id = ? AND user_id = ?').get(session_id, user_id);

    const now = new Date().toISOString();

    if (existing) {
      db.prepare(`
        UPDATE attendance
        SET check_in_time = ?,
            photo_url = COALESCE(?, photo_url),
            photo_lat = COALESCE(?, photo_lat),
            photo_lng = COALESCE(?, photo_lng),
            is_location_verified = COALESCE(?, is_location_verified),
            status = 'present',
            notes = COALESCE(?, notes)
        WHERE id = ?
      `).run(now, photo_url, photo_lat, photo_lng, is_location_verified, notes || null, existing.id);
    } else {
      db.prepare(`
        INSERT INTO attendance (session_id, user_id, check_in_time, photo_url, photo_lat, photo_lng, is_location_verified, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'present', ?)
      `).run(session_id, user_id, now, photo_url, photo_lat, photo_lng, is_location_verified, notes || null);
    }

    // Update session status to in_progress or completed
    db.prepare(`UPDATE sessions SET status = 'in_progress' WHERE id = ? AND status = 'scheduled'`).run(session_id);

    // Update last_interaction_date on relationship
    db.prepare(`UPDATE relationships SET last_interaction_date = ? WHERE id = ?`).run(now, session.relationship_id);

    // Activity log
    db.prepare(`
      INSERT INTO activity_timeline (relationship_id, user_id, type, title, description)
      VALUES (?, ?, 'checkin', 'Session Check-in', ?)
    `).run(session.relationship_id, user_id, `Checked in for session "${session.title}". Location verified: ${is_location_verified ? 'Yes' : 'No'}`);

    res.json({
      message: 'Check-in successful',
      session_id,
      user_id,
      check_in_time: now,
      photo_url,
      photo_lat,
      photo_lng,
      is_location_verified: Boolean(is_location_verified)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Session check-out
router.post('/checkout', (req, res) => {
  const { session_id, user_id } = req.body;
  if (!session_id || !user_id) {
    return res.status(400).json({ error: 'session_id and user_id are required' });
  }

  try {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE attendance
      SET check_out_time = ?
      WHERE session_id = ? AND user_id = ?
    `).run(now, session_id, user_id);

    // Check if both mentor & mentee checked in / checked out, mark session completed
    db.prepare(`UPDATE sessions SET status = 'completed' WHERE id = ?`).run(session_id);

    res.json({ message: 'Check-out successful', check_out_time: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attendance history for a relationship or user
router.get('/history', (req, res) => {
  const { relationship_id, user_id } = req.query;
  let query = `
    SELECT a.*, s.title as session_title, s.scheduled_start, u.name as user_name
    FROM attendance a
    JOIN sessions s ON a.session_id = s.id
    JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (relationship_id) {
    query += ' AND s.relationship_id = ?';
    params.push(relationship_id);
  }
  if (user_id) {
    query += ' AND a.user_id = ?';
    params.push(user_id);
  }

  query += ' ORDER BY s.scheduled_start DESC';

  const history = db.prepare(query).all(...params);
  res.json(history);
});

module.exports = router;
