// utils/generateJWT.js
// Handles JWT token generation and verification
// Access tokens are short-lived; refresh tokens are long-lived

const jwt = require('jsonwebtoken');

/**
 * Generates a short-lived access token (default: 15 minutes)
 * @param {string} userId - Firebase UID of the user
 * @param {string} email - User's email
 * @returns {string} - Signed JWT access token
 */
const generateAccessToken = (userId, email) => {
  const payload = {
    uid: userId,
    email: email,
    type: 'access'
  };

  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    issuer: 'igraph-it',
    audience: 'igraph-it-users'
  });
};

/**
 * Generates a long-lived refresh token (default: 7 days)
 * @param {string} userId - Firebase UID of the user
 * @returns {string} - Signed JWT refresh token
 */
const generateRefreshToken = (userId) => {
  const payload = {
    uid: userId,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: 'igraph-it'
  });
};

/**
 * Verifies an access token
 * @param {string} token - JWT token to verify
 * @returns {object} - Decoded payload if valid
 * @throws {Error} - If token is invalid or expired
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: 'igraph-it',
    audience: 'igraph-it-users'
  });
};

/**
 * Verifies a refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {object} - Decoded payload if valid
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'igraph-it'
  });
};

/**
 * Generates a short-lived, single-purpose "socket ticket" — used only to
 * authenticate the WebSocket handshake in collabSocket.js. This exists
 * because the WebSocket connects directly to this server's own domain
 * (not through Vercel's same-origin /api/* proxy that REST calls use), so
 * the httpOnly access_token cookie — scoped to the frontend's domain —
 * never reaches this server on the socket handshake. Rather than exposing
 * the real access token to client-side JS (which would defeat the point
 * of it being httpOnly), the client fetches one of these over the
 * already-working authenticated REST connection, then hands it to the
 * socket handshake instead.
 * 30s is deliberately short — it only needs to survive the handshake
 * itself, not the whole session, and shouldn't be reusable as a
 * general-purpose credential.
 * @param {string} userId - Firebase UID of the user
 * @returns {string} - Signed JWT socket ticket
 */
const generateSocketTicket = (userId) => {
  const payload = {
    uid: userId,
    type: 'socket_ticket'
  };

  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '30s',
    issuer: 'igraph-it',
    audience: 'igraph-it-socket'
  });
};

/**
 * Verifies a socket ticket. Reuses JWT_ACCESS_SECRET (rather than a new
 * secret) since a ticket is just a narrowly-scoped, short-lived access
 * credential — the type/audience/expiry checks are what keep it from
 * being usable as anything else.
 * @param {string} ticket - JWT ticket to verify
 * @returns {object} - Decoded payload if valid
 * @throws {Error} - If ticket is invalid, expired, or wrong type
 */
const verifySocketTicket = (ticket) => {
  const decoded = jwt.verify(ticket, process.env.JWT_ACCESS_SECRET, {
    issuer: 'igraph-it',
    audience: 'igraph-it-socket'
  });

  if (decoded.type !== 'socket_ticket') {
    throw new Error('Invalid ticket type.');
  }

  return decoded;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateSocketTicket,
  verifySocketTicket
};

