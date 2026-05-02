// utils/generateOTP.js
// Generates a cryptographically secure 6-digit OTP
// Uses crypto module (built into Node.js) for security

const crypto = require('crypto');

/**
 * Generates a secure 6-digit numeric OTP
 * @returns {string} - 6-digit OTP string (padded with leading zeros if needed)
 */
const generateOTP = () => {
  // Generate a random number between 0 and 999999
  // Using crypto.randomInt for cryptographic security
  const otp = crypto.randomInt(100000, 999999);
  return otp.toString();
};

/**
 * Returns the OTP expiration timestamp
 * @param {number} minutes - How many minutes until expiry (default: 5)
 * @returns {Date} - Expiration date object
 */
const getOTPExpiry = (minutes = 5) => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};

module.exports = { generateOTP, getOTPExpiry };