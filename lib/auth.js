const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
    try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

function getTokenFromReq(req) {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/token=([^;]+)/);
    return match ? match[1] : null;
}

module.exports = { signToken, verifyToken, getTokenFromReq };