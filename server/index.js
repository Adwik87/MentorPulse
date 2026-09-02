const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./db');

const usersRouter = require('./routes/users');
const relationshipsRouter = require('./routes/relationships');
const goalsRouter = require('./routes/goals');
const sessionsRouter = require('./routes/sessions');
const attendanceRouter = require('./routes/attendance');
const momsRouter = require('./routes/moms');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Serve static frontend build
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

app.listen(PORT, () => {
  console.log(`MentorPulse is running on http://localhost:${PORT}`);
});
