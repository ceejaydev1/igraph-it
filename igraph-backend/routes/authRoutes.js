// igraph-backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/authController');
const {
  validateSignup,
  validateSignin,
  validateOTP,
  validateEmail,
  validateResetPassword,
  validateGoogleAuth
} = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');

// ============================================================================
// RATE LIMITERS - Security against brute force and abuse
// ============================================================================

// Prevent OTP flooding - 5 requests per 15 minutes
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Prevent login/signup brute force - 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ⭐ CRITICAL: Protect sensitive write operations - 3 attempts per hour
const sensitiveWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many attempts. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Global API limiter - 100 requests per 15 minutes (fallback)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================================================
// AUTH ROUTES - With comprehensive rate limiting
// ============================================================================

// ─── Registration & Verification ────────────────────────────────────────────

// Sign up - limited to prevent account creation abuse
router.post('/signup', authLimiter, validateSignup, authController.signup);

// Verify OTP - limited to prevent brute force OTP guessing
router.post('/verify-otp', otpLimiter, validateOTP, authController.verifyOTP);

// Resend OTP - limited to prevent email bombing
router.post('/resend-otp', otpLimiter, validateEmail, authController.resendOTP);

// ─── Authentication ─────────────────────────────────────────────────────────

// Sign in - limited to prevent credential brute force
router.post('/signin', authLimiter, validateSignin, authController.signin);

// Google Auth - limited to prevent abuse
router.post('/google', authLimiter, validateGoogleAuth, authController.googleAuth);

// ─── Password Management ────────────────────────────────────────────────────

// Forgot password - limited to prevent email bombing
router.post('/forgot-password', otpLimiter, validateEmail, authController.forgotPassword);

// Verify reset OTP - limited to prevent OTP brute force
router.post('/verify-reset-otp', otpLimiter, validateOTP, authController.verifyResetOTP);

// ⭐ Reset password - HEAVILY LIMITED (3 attempts per hour)
// This is a destructive write operation that must be protected
router.post('/reset-password', sensitiveWriteLimiter, validateResetPassword, authController.resetPassword);

// ─── Session Management ─────────────────────────────────────────────────────

// Refresh token - no strict limit, but global limiter applies
router.post('/refresh-token', authController.refreshToken);

// Logout - protected route
router.post('/logout', protect, authController.logout);

// Get current user - protected route
router.get('/me', protect, authController.getCurrentUser);

// ─── Account Management ─────────────────────────────────────────────────────

// ⭐ Update profile - PROTECTED + HEAVILY LIMITED (3 attempts per hour)
// Prevents abuse of profile update endpoint
router.put('/update-profile', protect, sensitiveWriteLimiter, authController.updateProfile);

// ⭐ Change password - PROTECTED + HEAVILY LIMITED (3 attempts per hour)
// Critical security endpoint - must be rate limited
router.post('/change-password', protect, sensitiveWriteLimiter, authController.changePassword);

module.exports = router;