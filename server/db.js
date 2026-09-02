const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../mentorpulse.db');
let db;

try {
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
} catch (e) {
  console.warn('better-sqlite3 initialization failed, falling back to sqlite3 or memory driver if needed:', e.message);
  throw e;
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('mentor', 'mentee', 'coordinator', 'admin')),
      department TEXT,
      academic_year TEXT,
      professional_title TEXT,
      interests TEXT,
      goals_summary TEXT,
      bio TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mentor_id INTEGER NOT NULL REFERENCES users(id),
      mentee_id INTEGER NOT NULL REFERENCES users(id),
      program_name TEXT DEFAULT 'University Mentorship 2025',
      start_date DATE,
      end_date DATE,
      status TEXT CHECK(status IN ('active', 'completed', 'inactive', 'paused')) DEFAULT 'active',
      health_status TEXT CHECK(health_status IN ('excellent', 'good', 'needs_attention', 'at_risk')) DEFAULT 'good',
      last_interaction_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      relationship_id INTEGER NOT NULL REFERENCES relationships(id),
      mentee_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Academic',
      target_date DATE,
      status TEXT CHECK(status IN ('not_started', 'in_progress', 'completed', 'overdue')) DEFAULT 'not_started',
      progress_percentage INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      target_date DATE,
      is_completed BOOLEAN DEFAULT 0,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      relationship_id INTEGER NOT NULL REFERENCES relationships(id),
      title TEXT NOT NULL,
      description TEXT,
      scheduled_start DATETIME NOT NULL,
      scheduled_end DATETIME NOT NULL,
      location TEXT,
      meeting_type TEXT DEFAULT 'In-Person',
      status TEXT CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'missed')) DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      check_in_time DATETIME,
      check_out_time DATETIME,
      photo_url TEXT,
      photo_lat REAL,
      photo_lng REAL,
      is_location_verified BOOLEAN DEFAULT 0,
      status TEXT CHECK(status IN ('present', 'absent', 'excused', 'late')) DEFAULT 'present',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS moms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER UNIQUE NOT NULL REFERENCES sessions(id),
      discussion_points TEXT,
      decisions TEXT,
      observations TEXT,
      follow_ups TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS action_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mom_id INTEGER REFERENCES moms(id) ON DELETE CASCADE,
      relationship_id INTEGER NOT NULL REFERENCES relationships(id),
      title TEXT NOT NULL,
      description TEXT,
      assignee_id INTEGER NOT NULL REFERENCES users(id),
      deadline DATE,
      priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
      status TEXT CHECK(status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentor_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      relationship_id INTEGER NOT NULL REFERENCES relationships(id),
      mentor_id INTEGER NOT NULL REFERENCES users(id),
      mentee_id INTEGER NOT NULL REFERENCES users(id),
      note TEXT NOT NULL,
      is_private BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mentee_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER UNIQUE NOT NULL REFERENCES sessions(id),
      mentee_id INTEGER NOT NULL REFERENCES users(id),
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      feedback_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      relationship_id INTEGER REFERENCES relationships(id),
      user_id INTEGER REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT CHECK(type IN ('session', 'goal', 'action_item', 'system')) DEFAULT 'system',
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      user_name TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedData();
}

function seedData() {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (userCount > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, role, department, academic_year, professional_title, interests, goals_summary, bio, avatar_url)
    VALUES (@name, @email, @role, @department, @academic_year, @professional_title, @interests, @goals_summary, @bio, @avatar_url)
  `);

  const users = [
    { name: 'Dr. Eleanor Vance', email: 'eleanor.vance@university.edu', role: 'mentor', department: 'Computer Science', academic_year: null, professional_title: 'Associate Professor', interests: 'AI, Distributed Systems, Software Engineering', goals_summary: 'Guide mentees through research publication & industry prep', bio: '12+ years of academic and research experience.', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
    { name: 'Prof. Marcus Brody', email: 'marcus.brody@university.edu', role: 'mentor', department: 'Business Administration', academic_year: null, professional_title: 'Senior Faculty Lead', interests: 'Strategic Management, Leadership, Entrepreneurship', goals_summary: 'Develop executive leadership & startup skills', bio: 'Former McKinsey consultant and tech entrepreneur.', avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150' },
    { name: 'Dr. Sophia Reyes', email: 'sophia.reyes@university.edu', role: 'mentor', department: 'Data Science', academic_year: null, professional_title: 'Assistant Professor', interests: 'Machine Learning, Ethics in Tech', goals_summary: 'Empower women in STEM and guide capstone projects', bio: 'Specialist in ethical AI and predictive modeling.', avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },

    { name: 'Alex Rivera', email: 'alex.rivera@student.university.edu', role: 'mentee', department: 'Computer Science', academic_year: 'Senior (Year 4)', professional_title: 'Undergraduate Researcher', interests: 'Cloud Infrastructure, Web Dev, System Architecture', goals_summary: 'Secure a Software Engineer offer & complete honors thesis', bio: 'Passionate about full-stack web and open source.', avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150' },
    { name: 'Samantha Chen', email: 'samantha.chen@student.university.edu', role: 'mentee', department: 'Business Administration', academic_year: 'Junior (Year 3)', professional_title: 'Student Body Representative', interests: 'Product Management, Market Analytics', goals_summary: 'Transition into Associate Product Manager role', bio: 'Eager to bridge business strategy and technical execution.', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
    { name: 'David Kim', email: 'david.kim@student.university.edu', role: 'mentee', department: 'Data Science', academic_year: 'Graduate (Master 1)', professional_title: 'Data Analyst Intern', interests: 'NLP, Big Data Pipelines, SQL', goals_summary: 'Publish NLP paper and master PySpark', bio: 'Graduate student focused on healthcare NLP analytics.', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    { name: 'Jordan Taylor', email: 'jordan.taylor@student.university.edu', role: 'mentee', department: 'Computer Science', academic_year: 'Sophomore (Year 2)', professional_title: 'Student', interests: 'Cybersecurity, Linux, Networking', goals_summary: 'Get AWS Certified & prepare for summer internships', bio: 'Sophomore CS student seeking foundational mentorship.', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },

    { name: 'Dr. Arthur Pendelton', email: 'arthur.pendelton@university.edu', role: 'coordinator', department: 'Academic Affairs', academic_year: null, professional_title: 'Program Director', interests: 'Mentorship Program Design & Quality Assurance', goals_summary: 'Oversee faculty-student mentorship engagement', bio: 'Program Director ensuring academic and career outcomes.', avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
    { name: 'System Admin', email: 'admin@university.edu', role: 'admin', department: 'IT & Operations', academic_year: null, professional_title: 'System Administrator', interests: 'System Security, Audit Logging, User Governance', goals_summary: 'Ensure platform integrity and data compliance', bio: 'Maintains system governance and user access control.', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' }
  ];

  for (const u of users) {
    insertUser.run(u);
  }

  // Seed Relationships
  const insertRel = db.prepare(`
    INSERT INTO relationships (mentor_id, mentee_id, program_name, start_date, end_date, status, health_status, last_interaction_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRel.run(1, 4, 'STEM Excellence Program 2025', '2025-01-15', '2025-06-15', 'active', 'excellent', '2025-02-28 14:00:00'); // Eleanor & Alex
  insertRel.run(2, 5, 'Leadership & Entrepreneurship 2025', '2025-01-15', '2025-06-15', 'active', 'good', '2025-02-20 11:00:00'); // Marcus & Samantha
  insertRel.run(3, 6, 'Data Science Masters Track', '2025-01-10', '2025-06-15', 'active', 'needs_attention', '2025-02-10 10:00:00'); // Sophia & David
  insertRel.run(1, 7, 'STEM Excellence Program 2025', '2025-01-20', '2025-06-15', 'inactive', 'at_risk', '2025-01-22 15:00:00'); // Eleanor & Jordan (Inactive)

  // Seed Goals & Milestones
  const insertGoal = db.prepare(`
    INSERT INTO goals (relationship_id, mentee_id, title, description, category, target_date, status, progress_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMilestone = db.prepare(`
    INSERT INTO milestones (goal_id, title, target_date, is_completed, completed_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const g1 = insertGoal.run(1, 4, 'Complete Honors Thesis Draft', 'Write full literature review and methodology section for cloud architecture thesis.', 'Academic', '2025-04-15', 'in_progress', 60);
  insertMilestone.run(g1.lastInsertRowid, 'Outline Chapter 1 & 2', '2025-02-01', 1, '2025-01-28');
  insertMilestone.run(g1.lastInsertRowid, 'Draft Literature Review', '2025-02-20', 1, '2025-02-18');
  insertMilestone.run(g1.lastInsertRowid, 'Benchmark Experiments', '2025-03-20', 0, null);
  insertMilestone.run(g1.lastInsertRowid, 'Final Draft Review', '2025-04-10', 0, null);

  const g2 = insertGoal.run(1, 4, 'Prepare for Senior Technical Interviews', 'Practice system design and algorithmic problem solving.', 'Career', '2025-03-30', 'in_progress', 75);
  insertMilestone.run(g2.lastInsertRowid, 'Complete 50 LeetCode Mediums', '2025-02-15', 1, '2025-02-12');
  insertMilestone.run(g2.lastInsertRowid, '2 Mock System Design Interviews with Mentor', '2025-03-01', 1, '2025-02-28');
  insertMilestone.run(g2.lastInsertRowid, 'Apply to 10 Target Software Companies', '2025-03-15', 0, null);

  const g3 = insertGoal.run(2, 5, 'Build Product Management Portfolio', 'Document 2 product case studies showcasing user metrics and PRDs.', 'Professional', '2025-05-01', 'in_progress', 40);
  insertMilestone.run(g3.lastInsertRowid, 'Select Product Case Study Topic', '2025-02-10', 1, '2025-02-08');
  insertMilestone.run(g3.lastInsertRowid, 'Write Wireframes & PRD Document', '2025-03-10', 0, null);

  const g4 = insertGoal.run(3, 6, 'Publish NLP Paper Draft', 'Submit abstract to IEEE Student Data Science Conference.', 'Research', '2025-02-15', 'overdue', 20);
  insertMilestone.run(g4.lastInsertRowid, 'Draft Abstract', '2025-02-01', 1, '2025-02-05');
  insertMilestone.run(g4.lastInsertRowid, 'Complete Dataset Preprocessing', '2025-02-10', 0, null);

  // Seed Sessions
  const insertSession = db.prepare(`
    INSERT INTO sessions (relationship_id, title, description, scheduled_start, scheduled_end, location, meeting_type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const s1 = insertSession.run(1, 'Thesis Review & System Design Mock', 'Review literature review draft and run through a web-scale system design practice.', '2025-02-28 14:00', '2025-02-28 15:00', 'Science Building Room 402', 'In-Person', 'completed');
  const s2 = insertSession.run(1, 'Upcoming Spring Progress Sync', 'Discuss thesis experimental setup and target company applications.', '2025-03-10 14:00', '2025-03-10 15:00', 'Science Building Room 402', 'In-Person', 'scheduled');
  const s3 = insertSession.run(2, 'Product Case Study Wireframing', 'Review initial PRD outlines and user persona definitions.', '2025-02-20 11:00', '2025-02-20 12:00', 'Business School Hub 101', 'In-Person', 'completed');
  const s4 = insertSession.run(3, 'NLP Research Direction Review', 'Evaluate model performance and paper deadline extensions.', '2025-02-10 10:00', '2025-02-10 11:00', 'Online Zoom Room', 'Virtual', 'completed');
  const s5 = insertSession.run(4, 'Introductory Goal Setting', 'First session to lay out goals for spring semester.', '2025-01-22 15:00', '2025-01-22 16:00', 'CS Lounge', 'In-Person', 'completed');

  // Seed Attendance
  const insertAtt = db.prepare(`
    INSERT INTO attendance (session_id, user_id, check_in_time, check_out_time, photo_url, photo_lat, photo_lng, is_location_verified, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAtt.run(s1.lastInsertRowid, 1, '2025-02-28 13:58:00', '2025-02-28 15:02:00', null, 37.7749, -122.4194, 1, 'present', 'Mentor checked in on time');
  insertAtt.run(s1.lastInsertRowid, 4, '2025-02-28 14:01:00', '2025-02-28 15:02:00', '/uploads/session1_photo.jpg', 37.7749, -122.4194, 1, 'present', 'Mentee uploaded photo evidence in Science Building');

  insertAtt.run(s3.lastInsertRowid, 2, '2025-02-20 11:00:00', '2025-02-20 12:00:00', null, null, null, 1, 'present', null);
  insertAtt.run(s3.lastInsertRowid, 5, '2025-02-20 11:02:00', '2025-02-20 12:00:00', null, null, null, 1, 'present', null);

  insertAtt.run(s4.lastInsertRowid, 3, '2025-02-10 10:00:00', '2025-02-10 11:00:00', null, null, null, 1, 'present', null);
  insertAtt.run(s4.lastInsertRowid, 6, '2025-02-10 10:05:00', '2025-02-10 11:00:00', null, null, null, 1, 'present', null);

  // Seed MoMs
  const insertMom = db.prepare(`
    INSERT INTO moms (session_id, discussion_points, decisions, observations, follow_ups, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const m1 = insertMom.run(
    s1.lastInsertRowid,
    'Reviewed Alex\'s draft literature review for cloud thesis. Conducted 45-min mock system design question on designing a rate limiter.',
    'Approved Literature Review chapters 1 & 2 with minor edits to citation format. Recommended focus on token bucket algorithm for next design session.',
    'Alex showed strong grasp of horizontal scaling concepts but needs to speak with more confidence regarding trade-offs.',
    'Alex to complete benchmark testing script and send updated thesis draft before March 10 session.',
    1
  );

  // Seed Action Items
  const insertAction = db.prepare(`
    INSERT INTO action_items (mom_id, relationship_id, title, description, assignee_id, deadline, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAction.run(m1.lastInsertRowid, 1, 'Refine Literature Review Citations', 'Format citations using IEEE style guidelines.', 4, '2025-03-05', 'medium', 'completed');
  insertAction.run(m1.lastInsertRowid, 1, 'Implement Benchmark Testing Script', 'Run latency tests for SQLite vs PostgreSQL in containerized test bed.', 4, '2025-03-09', 'high', 'in_progress');
  insertAction.run(m1.lastInsertRowid, 1, 'Send System Design Reading List', 'Share articles on distributed lock managers and consensus algorithms.', 1, '2025-03-03', 'low', 'completed');

  // Seed Mentor Notes
  const insertNote = db.prepare(`
    INSERT INTO mentor_notes (relationship_id, mentor_id, mentee_id, note, is_private)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertNote.run(1, 1, 4, 'Alex is making remarkable progress on thesis. Responds very well to structured feedback.', 1);
  insertNote.run(3, 3, 6, 'David seems overwhelmed with graduate coursework. Needs guidance on time management.', 1);

  // Seed Mentee Feedback
  const insertFB = db.prepare(`
    INSERT INTO mentee_feedback (session_id, mentee_id, rating, feedback_text)
    VALUES (?, ?, ?, ?)
  `);

  insertFB.run(s1.lastInsertRowid, 4, 5, 'Extremely helpful mock session! Dr. Vance helped me structure system design trade-offs much better.');

  // Seed Activity Timeline
  const insertAct = db.prepare(`
    INSERT INTO activity_timeline (relationship_id, user_id, type, title, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertAct.run(1, 1, 'session', 'Completed Mentoring Session', 'Thesis Review & System Design Mock session held.');
  insertAct.run(1, 4, 'goal', 'Goal Progress Updated', 'Honors Thesis Draft reached 60% completion.');
  insertAct.run(1, 1, 'mom', 'Meeting Minutes Logged', 'MoM created for session on Feb 28, 2025.');
  insertAct.run(1, 4, 'checkin', 'Location Verified Check-in', 'Checked in at Science Building Room 402 with photo verification.');

  // Seed Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, ?, ?, ?)
  `);

  insertNotif.run(4, 'Upcoming Session', 'You have a session "Upcoming Spring Progress Sync" scheduled for March 10, 2025.', 'session');
  insertNotif.run(4, 'Action Item Due Soon', 'Action item "Implement Benchmark Testing Script" is due on March 09, 2025.', 'action_item');
  insertNotif.run(6, 'Overdue Goal Alert', 'Goal "Publish NLP Paper Draft" target date was Feb 15, 2025.', 'goal');
  insertNotif.run(1, 'Mentee Feedback Submitted', 'Alex Rivera submitted feedback (5/5 stars) for Feb 28 session.', 'system');

  // Seed Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, user_name, action, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(1, 'Dr. Eleanor Vance', 'CREATE_MOM', 'session', s1.lastInsertRowid, 'Logged meeting minutes and created 3 action items.');
  insertAudit.run(4, 'Alex Rivera', 'CHECK_IN', 'session', s1.lastInsertRowid, 'Verified location check-in with GPS photo upload.');
  insertAudit.run(9, 'System Admin', 'RELATIONSHIP_STATUS_UPDATE', 'relationship', 4, 'Flagged relationship between Eleanor Vance and Jordan Taylor as inactive.');

  console.log('Database schema and seed data initialized successfully.');
}

module.exports = {
  db,
  initDb
};
