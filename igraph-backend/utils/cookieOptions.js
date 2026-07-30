// utils/cookieOptions.js
// Shared cookie attribute builders for the httpOnly session cookies.
//
// Frontend and backend are deployed on different domains (Vercel vs Render),
// which makes this a genuine cross-site setup: SameSite=Strict/Lax would
// simply never be sent on cross-site XHR/fetch, breaking auth outright. That
// forces SameSite=None, which requires Secure, and weakens the CSRF
// protection SameSite would otherwise provide — see middleware/csrfMiddleware.js
// for the compensating control. In local dev (same-site localhost:5000 <->
// localhost:8081) SameSite=Lax works and doesn't require HTTPS.

const isCrossSite = process.env.NODE_ENV === 'production';

const baseAttributes = {
  httpOnly: true,
  secure: isCrossSite,
  sameSite: isCrossSite ? 'none' : 'lax',
};

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000; // mirrors JWT_ACCESS_EXPIRY default (15m)
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // mirrors JWT_REFRESH_EXPIRY default (7d)

// rememberMe === false means "sign out when the browser closes" — omitting
// maxAge/expires entirely is what makes a cookie a true session cookie.
// Any other value (true, undefined, missing) keeps today's implicit
// always-persistent behavior so no caller not yet touched by this refactor
// silently regresses.
const getAccessCookieOptions = (rememberMe) => ({
  ...baseAttributes,
  path: '/',
  ...(rememberMe === false ? {} : { maxAge: ACCESS_MAX_AGE_MS }),
});

const getRefreshCookieOptions = (rememberMe) => ({
  ...baseAttributes,
  path: '/api/auth',
  ...(rememberMe === false ? {} : { maxAge: REFRESH_MAX_AGE_MS }),
});

// res.clearCookie needs the same attributes (minus maxAge/expires) used when
// the cookie was set, or the browser won't recognize it as the same cookie
// to delete.
const getClearCookieOptions = (path) => ({
  ...baseAttributes,
  path,
});

module.exports = {
  getAccessCookieOptions,
  getRefreshCookieOptions,
  getClearCookieOptions,
};
