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
const { issueCsrfToken } = require('../middleware/csrfMiddleware');

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
 * @param {boolean} [opts.keyByAccount] - Default true. Set false for a route
 *   whose body never carries a plain `email` (Google auth sends only an
 *   idToken) — emailKey() silently falls back to IP keying when email is
 *   missing (see its own comment), which turns "per-account" into a SECOND,
 *   tighter cap shared across every account hitting that route from one IP,
 *   not a per-account limit at all. That's what broke several different
 *   classmates signing in with Google from the same lab network at once:
 *   they were all unknowingly sharing one combined budget meant to protect
 *   a single account from brute-forcing — a threat model Google auth
 *   doesn't even have (there's no password to guess). false skips the
 *   redundant/harmful account layer and keys everything (lab mode included)
 *   by IP only, same as ipLimiter already does correctly on its own.
 */
const buildLimiters = ({ prefix, windowMs, ipMax, accountMax, message, keyByAccount = true }) => {
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
        keyGenerator: keyByAccount ? emailKey(prefix) : ipKey(prefix),
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

  if (!keyByAccount) {
    return [ipLimiter];
  }

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

// ipMax on every limiter below is sized for a shared-NAT setting (a school
// computer lab's whole class exits through one public IP) rather than a
// single person — accountMax stays tight since that one's keyed per email/
// user id and is the real defense against brute-forcing one account, however
// many people share the IP it's coming from.
const otpLimiters = buildLimiters({
  prefix:     'otp',
  windowMs:   15 * 60 * 1000,
  ipMax:      100,
  accountMax: 5,
  message:    'Too many OTP requests. Please wait 15 minutes before trying again.',
});

const otpVerifyLimiters = buildLimiters({
  prefix:     'otp-verify',
  windowMs:   15 * 60 * 1000,
  ipMax:      200,
  accountMax: 10,
  message:    'Too many verification attempts. Please wait 15 minutes.',
});

const authLimiters = buildLimiters({
  prefix:     'auth',
  windowMs:   15 * 60 * 1000,
  ipMax:      150,
  accountMax: 10,
  message:    'Too many attempts. Please try again later.',
});

// /google and /link-google specifically — same window/IP budget as
// authLimiters (150/15min, already sized for a shared-NAT lab), but without
// its account layer: see buildLimiters' keyByAccount doc comment for why
// pairing it with those two routes was actively counterproductive rather
// than just redundant.
const googleAuthLimiters = buildLimiters({
  prefix:      'google-auth',
  windowMs:    15 * 60 * 1000,
  ipMax:       150,
  accountMax:  10, // unused when keyByAccount is false; kept for symmetry with authLimiters
  message:     'Too many attempts. Please try again later.',
  keyByAccount: false,
});

const resetPasswordLimiters = buildLimiters({
  prefix:     'reset-pw',
  windowMs:   60 * 60 * 1000,
  ipMax:      100,
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
        max:             80,
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

// Issues the double-submit CSRF cookie/token pair the web frontend echoes
// back as X-CSRF-Token on state-changing requests. GET, so it's naturally
// exempt from csrfMiddleware's own check — no special-casing needed there.
router.get('/csrf-token', (req, res) => {
  const csrfToken = issueCsrfToken(req, res);
  res.status(200).json({ success: true, data: { csrfToken } });
});

// Registration & Verification
router.post('/signup',     ...authLimiters,      validateSignup, authController.signup);
router.post('/verify-otp', ...otpVerifyLimiters, validateOTP,    authController.verifyOTP);
router.post('/resend-otp', ...otpLimiters,       validateEmail,  authController.resendOTP);

// Authentication
router.post('/signin',       ...authLimiters,       validateSignin,     authController.signin);
router.post('/google',       ...googleAuthLimiters, validateGoogleAuth, authController.googleAuth);
router.post('/link-google',  ...googleAuthLimiters, validateLinkGoogle, authController.linkGoogleAccount);

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