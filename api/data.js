const { sql } = require('../lib/db');
const { parseBody, getAuthPayload } = require('../lib/auth');

module.exports = async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const payload = getAuthPayload(req);

    if (!payload) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT data
        FROM user_data
        WHERE user_id = ${payload.userId}
        LIMIT 1
      `;

      return res.status(200).json(rows[0]?.data || {});
    }

    if (req.method === 'POST') {
      const data = parseBody(req);

      await sql`
        INSERT INTO user_data (user_id, data, updated_at)
        VALUES (${payload.userId}, ${JSON.stringify(data)}::jsonb, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Data API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};