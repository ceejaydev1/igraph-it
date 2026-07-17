const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const authController = require('../controllers/authController');
const {
  validateSignup,
  validateSignin,
  validateOTP,
  validateEmail,
  validateResetPassword,
  validateGoogleAuth,
  validateLinkGoogle,
  validateSetPassword
} = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');

// ENVIRONMENT

const isLabMode = process.env.IS_LAB_MODE === 'true';
const LAB_MAX   = 100;

if (isLabMode && process.env.NODE_ENV === 'production') {
  console.error('[SECURITY] IS_LAB_MODE=true is set in a production environment. Ignoring lab mode.');
}
const LAB_ACTIVE = isLabMode && process.env.NODE_ENV !== 'production';

if (LAB_ACTIVE) {
  console.warn('[RATE LIMIT] Lab mode is ACTIVE — per-account limits at 100, IP limits disabled.');
}

const emailKey = (prefix) => (req) => {
  try {
    const raw = req.body?.email;
    if (typeof raw === 'string' && raw.length > 0 && raw.length <= 254) {
      return `${prefix}:acct:${raw.trim().toLowerCase()}`;
    }
  } catch (_) {
    // body parsing edge case — fall through to IP
  }
  return `${prefix}:ip:${ipKeyGenerator(req)}`; // ✅ FIXED
};

const ipKey = (prefix) => (req) => {
  return `${prefix}:ip:${ipKeyGenerator(req)}`; // ✅ FIXED: removed erroneous second arg
};

/**
 * @param {object} opts
 * @param {string}  opts.prefix        - Unique string key prefix (e.g. 'otp')
 * @param {number}  opts.windowMs      - Window in milliseconds
 * @param {number}  opts.ipMax         - Max requests per IP per window (prod)
 * @param {number}  opts.accountMax    - Max requests per account per window (prod)
 * @param {string}  opts.message       - Human-readable rate limit message
 */
const buildLimiters = ({ prefix, windowMs, ipMax, accountMax, message }) => {
  const baseConfig = {
    windowMs,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/ping',
    message: { success: false, message },
  };

  if (LAB_ACTIVE) {
    return [
      rateLimit({
        ...baseConfig,
        max: LAB_MAX,
        keyGenerator: emailKey(prefix),
      }),
    ];
  }

  const ipLimiter = rateLimit({
    ...baseConfig,
    max: ipMax,
    keyGenerator: ipKey(prefix),
    message: {
      success: false,
      message: `${message} (IP blocked)`,
    },
  });

  const accountLimiter = rateLimit({
    ...baseConfig,
    max: accountMax,
    keyGenerator: emailKey(prefix),
    message: {
      success: false,
      message: `${message} (Account blocked)`,
    },
  });

  return [ipLimiter, accountLimiter];
};

const otpLimiters = buildLimiters({
  prefix:     'otp',
  windowMs:   15 * 60 * 1000,
  ipMax:      20,
  accountMax: 3,
  message:    'Too many OTP requests. Please wait 15 minutes before trying again.',
});

const otpVerifyLimiters = buildLimiters({
  prefix:     'otp-verify',
  windowMs:   15 * 60 * 1000,
  ipMax:      50,
  accountMax: 10,
  message:    'Too many verification attempts. Please wait 15 minutes.',
});

const authLimiters = buildLimiters({
  prefix:     'auth',
  windowMs:   15 * 60 * 1000,
  ipMax:      30,
  accountMax: 10,
  message:    'Too many attempts. Please try again later.',
});

const resetPasswordLimiters = buildLimiters({
  prefix:     'reset-pw',
  windowMs:   60 * 60 * 1000,
  ipMax:      20,
  accountMax: 5,
  message:    'Too many password reset attempts. Please try again after an hour.',
});

const changePasswordAccountKey = (req) => {
  if (LAB_ACTIVE) {
    const userId = req.user?.id || req.user?._id?.toString();
    if (userId) return `change-pw:acct:${userId}`;
    return `change-pw:ip:${ipKeyGenerator(req)}`; // ✅ FIXED
  }
  return `change-pw:ip:${ipKeyGenerator(req)}`; // ✅ FIXED
};

const changePasswordLimiters = LAB_ACTIVE
  ? [
      rateLimit({
        windowMs:        15 * 60 * 1000,
        max:             LAB_MAX,
        keyGenerator:    changePasswordAccountKey,
        standardHeaders: true,
        legacyHeaders:   false,
        message:         { success: false, message: 'Too many password change attempts. Please try again in 15 minutes.' },
      }),
    ]
  : [
      rateLimit({
        windowMs:        15 * 60 * 1000,
        max:             20,
        keyGenerator:    ipKey('change-pw'),
        standardHeaders: true,
        legacyHeaders:   false,
        message:         { success: false, message: 'Too many password change attempts. Please try again in 15 minutes. (IP blocked)' },
      }),
      rateLimit({
        windowMs:        15 * 60 * 1000,
        max:             5,
        keyGenerator:    changePasswordAccountKey,
        standardHeaders: true,
        legacyHeaders:   false,
        message:         { success: false, message: 'Too many password change attempts. Please try again in 15 minutes. (Account blocked)' },
      }),
    ];

// ROUTES

router.get('/ping', authController.ping);

// Registration & Verification
router.post('/signup',     ...authLimiters,      validateSignup, authController.signup);
router.post('/verify-otp', ...otpVerifyLimiters, validateOTP,    authController.verifyOTP);
router.post('/resend-otp', ...otpLimiters,       validateEmail,  authController.resendOTP);

// Authentication
router.post('/signin',       ...authLimiters, validateSignin,     authController.signin);
router.post('/google',       ...authLimiters, validateGoogleAuth, authController.googleAuth);
router.post('/link-google',  ...authLimiters, validateLinkGoogle, authController.linkGoogleAccount);

// Password Management
router.post('/forgot-password',  ...otpLimiters,           validateEmail,         authController.forgotPassword);
router.post('/verify-reset-otp', ...otpVerifyLimiters,     validateOTP,           authController.verifyResetOTP);
router.post('/reset-password',   ...resetPasswordLimiters, validateResetPassword, authController.resetPassword);

// Session Management 
router.post('/refresh-token', authController.refreshToken);
router.post('/logout',        protect, authController.logout);
router.get('/me',             protect, authController.getCurrentUser);

// Account Management
router.put('/update-profile',   protect, authController.updateProfile);
router.post('/change-password', protect, ...changePasswordLimiters, authController.changePassword);
router.post('/set-password',    protect, ...changePasswordLimiters, validateSetPassword, authController.setPassword);

module.exports = router;