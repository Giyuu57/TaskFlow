const { verifyToken, getTokenFromReq } = require('../lib/auth');

module.exports = async (req, res) => {
    const token = getTokenFromReq(req);
    const payload = token ? verifyToken(token) : null;
    if (!payload) return res.status(401).json({ error: 'Not authenticated' });
    res.status(200).json({ email: payload.email });
};