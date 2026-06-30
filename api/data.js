const { sql } = require('../lib/db');
const { verifyToken, getTokenFromReq } = require('../lib/auth');
const { getJsonBody } = require('../lib/parseBody');

module.exports = async (req, res) => {
    const token = getTokenFromReq(req);
    const payload = token ? verifyToken(token) : null;
    if (!payload) return res.status(401).json({ error: 'Not authenticated' });

    if (req.method === 'GET') {
        try {
            const result = await sql`SELECT data FROM user_data WHERE user_id = ${payload.userId}`;
            res.status(200).json(result.rows[0]?.data || {});
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    } else if (req.method === 'POST') {
        try {
            const body = await getJsonBody(req);
            await sql`UPDATE user_data SET data = ${JSON.stringify(body)}::jsonb, updated_at = NOW() WHERE user_id = ${payload.userId}`;
            res.status(200).json({ ok: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};