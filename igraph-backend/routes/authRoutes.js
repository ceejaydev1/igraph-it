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

// Prevent OTP flooding
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 15 minutes.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  }
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

router.post('/signup', authLimiter, validateSignup, authController.signup);
router.post('/verify-otp', otpLimiter, validateOTP, authController.verifyOTP);
router.post('/resend-otp', otpLimiter, validateEmail, authController.resendOTP);
router.post('/signin', authLimiter, validateSignin, authController.signin);
router.post('/google', authLimiter, validateGoogleAuth, authController.googleAuth);
router.post('/forgot-password', otpLimiter, validateEmail, authController.forgotPassword);
router.post('/verify-reset-otp', otpLimiter, validateOTP, authController.verifyResetOTP);
router.post('/reset-password', authLimiter, validateResetPassword, authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getCurrentUser);

// ============================================================================
// ✅ UPDATE PROFILE ROUTE - Name only (no profile picture upload)
// ============================================================================

router.put('/update-profile', protect, authController.updateProfile);
router.post('/change-password', protect, authController.changePassword);

module.exports = router;