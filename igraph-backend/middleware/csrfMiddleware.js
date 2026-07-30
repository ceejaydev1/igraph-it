// middleware/csrfMiddleware.js
// Double-submit CSRF protection — the compensating control for the auth
// cookies needing SameSite=None (see utils/cookieOptions.js for why).
//
// `csrf_token` is deliberately NOT httpOnly: it's a nonce the frontend must
// read and echo back as a header, not a credential. Its whole job is proving
// the request originated from JS running on our own origin (which can read
// the cookie and set the header) rather than a form/script on someone else's
// page (which can't read our cookies at all).

const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const isCrossSite = process.env.NODE_ENV === 'production';

const issueCsrfToken = (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: isCrossSite,
    sameSite: isCrossSite ? 'none' : 'lax',
    path: '/',
    maxAge: CSRF_MAX_AGE_MS,
  });
  return token;
};

// Native requests never carry a browser Origin header at all — server.js's
// own CORS check already treats a missing Origin as "non-browser, allow"
// (see corsOptions.origin), so we reuse that exact signal here rather than
// adding a separate platform flag the frontend would have to thread through.
const verifyCsrfToken = (req, res, next) => {
  if (!req.headers.origin) return next();

  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

  const cookieToken = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : undefined;
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token.',
      code: 'CSRF_INVALID',
    });
  }

  next();
};

module.exports = {
  issueCsrfToken,
  verifyCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
};
