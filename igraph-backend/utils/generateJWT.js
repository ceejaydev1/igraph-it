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

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};

