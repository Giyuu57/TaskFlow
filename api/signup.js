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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUsers = await sql`
      SELECT id
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Account already exists. Please log in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const users = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${passwordHash})
      RETURNING id, email
    `;

    const user = users[0];

    await sql`
      INSERT INTO user_data (user_id, data)
      VALUES (${user.id}, '{}'::jsonb)
      ON CONFLICT (user_id) DO NOTHING
    `;

    const token = createToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      id: user.id,
      email: user.email,
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Server error during signup' });
  }
};