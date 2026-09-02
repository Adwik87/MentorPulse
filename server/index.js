const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');

const usersRouter = require('./routes/users');
const relationshipsRouter = require('./routes/relationships');
const goalsRouter = require('./routes/goals');
const sessionsRouter = require('./routes/sessions');
const attendanceRouter = require('./routes/attendance');
const momsRouter = require('./routes/moms');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialize DB schema & seed data
initDb();

// Register API routes
app.use('/api/users', usersRouter);
app.use('/api/relationships', relationshipsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/moms', momsRouter);
app.use('/api/analytics', analyticsRouter);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`MentorPulse Express Server running on port ${PORT}`);
});
