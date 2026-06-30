const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is missing in Vercel environment variables');
  }

  return secret;
}

function parseBody(req) {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';

  res.setHeader(
    'Set-Cookie',
    [
      `token=${token}`,
      'HttpOnly',
      'Path=/',
      'Max-Age=604800',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ')
  );
}

function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
  );
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';

  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split('=')[1];
}

function getAuthPayload(req) {
  const token = getCookie(req, 'token');

  if (!token) return null;

  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

module.exports = {
  parseBody,
  createToken,
  setAuthCookie,
  clearAuthCookie,
  getAuthPayload,
};