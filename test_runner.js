const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Helper to make API calls to local Express server
function apiCall(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING BACKEND INTEGRATION TESTS ---');

  // Start server process
  const { initDb } = require('./server/db');
  initDb();
  const app = require('./server/index');

  // Wait 1 second for server startup
  await new Promise(r => setTimeout(r, 1000));

  try {
    // 1. Get Users
    console.log('Test 1: GET /api/users');
    const uRes = await apiCall('/api/users');
    assert.strictEqual(uRes.status, 200);
    assert.ok(Array.isArray(uRes.body));
    assert.ok(uRes.body.length >= 8);
    console.log('PASSED: Users endpoint returned', uRes.body.length, 'users');

    // 2. Get Relationships
    console.log('Test 2: GET /api/relationships');
    const rRes = await apiCall('/api/relationships');
    assert.strictEqual(rRes.status, 200);
    assert.ok(Array.isArray(rRes.body));
    assert.ok(rRes.body.length >= 4);
    console.log('PASSED: Relationships endpoint returned', rRes.body.length, 'relationships');

    // 3. Create Session
    console.log('Test 3: POST /api/sessions');
    const sRes = await apiCall('/api/sessions', 'POST', {
      relationship_id: 1,
      title: 'Automated Test Session',
      description: 'Testing session creation API',
      scheduled_start: '2025-03-15 10:00:00',
      scheduled_end: '2025-03-15 11:00:00',
      location: 'Science Hall 101',
      meeting_type: 'In-Person'
    });
    assert.strictEqual(sRes.status, 201);
    assert.ok(sRes.body.id);
    const newSessionId = sRes.body.id;
    console.log('PASSED: Created session ID', newSessionId);

    // 4. Create MoM for new session
    console.log('Test 4: POST /api/moms');
    const momRes = await apiCall('/api/moms', 'POST', {
      session_id: newSessionId,
      discussion_points: 'Automated test discussion',
      decisions: 'Automated test decision',
      action_items: [
        {
          title: 'Automated Action Item 1',
          description: 'Follow up on unit tests',
          assignee_id: 4,
          deadline: '2025-03-20',
          priority: 'high'
        }
      ]
    });
    assert.strictEqual(momRes.status, 201);
    console.log('PASSED: Created MoM and Action Items for session ID', newSessionId);

    // 5. Coordinator Overview
    console.log('Test 5: GET /api/analytics/coordinator-overview');
    const cRes = await apiCall('/api/analytics/coordinator-overview');
    assert.strictEqual(cRes.status, 200);
    assert.ok(cRes.body.metrics);
    assert.ok(cRes.body.metrics.total_relationships >= 4);
    console.log('PASSED: Coordinator overview returned valid metrics');

    console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY ---');
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

runTests();
