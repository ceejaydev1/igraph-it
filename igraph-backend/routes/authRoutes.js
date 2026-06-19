// igraph-backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');

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
// ✅ UPDATE PROFILE ROUTE WITH MULTER SUPPORT
// ============================================================================

router.put(
  '/update-profile', 
  protect, 
  (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    const isMultipart = contentType.includes('multipart/form-data');
    
    console.log(`📤 Content-Type: ${contentType}`);
    console.log(`📤 Is multipart: ${isMultipart}`);
    
    if (isMultipart) {
      const upload = req.app.get('upload');
      upload.single('profilePicture')(req, res, (err) => {
        if (err) {
          console.error('❌ Multer error:', err);
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(413).json({
                success: false,
                message: 'Image too large. Maximum size is 5MB.',
                code: 'FILE_TOO_LARGE'
              });
            }
            return res.status(400).json({
              success: false,
              message: err.message,
              code: 'UPLOAD_ERROR'
            });
          }
          return res.status(400).json({
            success: false,
            message: err.message || 'File upload error'
          });
        }
        next();
      });
    } else {
      next();
    }
  },
  authController.updateProfile
);

router.post('/change-password', protect, authController.changePassword);

module.exports = router;