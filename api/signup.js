const bcrypt = require('bcryptjs');
const { sql } = require('../lib/db');
const { signToken } = require('../lib/auth');
const { getJsonBody } = require('../lib/parseBody');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = await getJsonBody(req);
    const email = body?.email;
    const password = body?.password;
    if (!email || !password || password.length < 6) {
        return res.status(400).json({ error: 'Email and password (min 6 chars) required' });
    }
    try {
        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

        const hash = await bcrypt.hash(password, 10);
        const result = await sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${hash}) RETURNING id`;
        const userId = result[0].id;

        await sql`INSERT INTO user_data (user_id, data) VALUES (${userId}, '{}'::jsonb)`;

        const token = signToken({ userId, email });
        res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; Secure`);
        res.status(200).json({ email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};