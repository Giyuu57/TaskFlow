const bcrypt = require('bcryptjs');
const { sql } = require('../lib/db');
const { signToken } = require('../lib/auth');
const { getJsonBody } = require('../lib/pareBody');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { email, password } = await getJsonBody(req);
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    try {
        const result = await sql`SELECT id, password_hash FROM users WHERE email = ${email}`;
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
        const token = signToken({ userId: user.id, email });
        res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; Secure`);
        res.status(200).json({ email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};