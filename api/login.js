const bcrypt = require('bcryptjs');
const { sql } = require('../lib/db');
const { parseBody, createToken, setAuthCookie } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseBody(req);

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await sql`
      SELECT id, email, password_hash
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      id: user.id,
      email: user.email,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
};