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

//prevent OTP flooding
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 OTP requests per 15 min per IP
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

//ROUTES

// POST /api/auth/signup
router.post('/signup', authLimiter, validateSignup, authController.signup);

// POST /api/auth/verify-otp
router.post('/verify-otp', otpLimiter, validateOTP, authController.verifyOTP);

// POST /api/auth/resend-otp
router.post('/resend-otp', otpLimiter, validateEmail, authController.resendOTP);

// POST /api/auth/signin
router.post('/signin', authLimiter, validateSignin, authController.signin);

// POST /api/auth/google
router.post('/google', authLimiter, validateGoogleAuth, authController.googleAuth);

// POST /api/auth/forgot-password
router.post('/forgot-password', otpLimiter, validateEmail, authController.forgotPassword);

// POST /api/auth/verify-reset-otp
router.post('/verify-reset-otp', otpLimiter, validateOTP, authController.verifyResetOTP);

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, validateResetPassword, authController.resetPassword);

// POST /api/auth/refresh-token
router.post('/refresh-token', authController.refreshToken);

// POST /api/auth/logout  
router.post('/logout', protect, authController.logout);

// GET /api/auth/me - Get current user profile
router.get('/me', protect, authController.getCurrentUser);

module.exports = router;
