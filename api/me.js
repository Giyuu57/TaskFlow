const { sql } = require('../lib/db');
const { getAuthPayload } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = getAuthPayload(req);

    if (!payload) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const users = await sql`
      SELECT id, email
      FROM users
      WHERE id = ${payload.userId}
      LIMIT 1
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.status(200).json(users[0]);
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};