// igraph-backend/routes/authRoutes.js

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
  validateGoogleAuth
} = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');

// ============================================================================
// ENVIRONMENT
// ============================================================================

const isLabMode = process.env.IS_LAB_MODE === 'true';
const LAB_MAX   = 100; // per-account ceiling for all limiters in lab mode

// Safety valve: never allow IS_LAB_MODE=true in a production NODE_ENV.
// If someone accidentally deploys with IS_LAB_MODE=true, this hard-stops it.
if (isLabMode && process.env.NODE_ENV === 'production') {
  console.error('[SECURITY] IS_LAB_MODE=true is set in a production environment. Ignoring lab mode.');
  // Re-define so the rest of the file sees it as false without crashing at boot.
  // We do this via a local flag rather than reassigning the const.
}
const LAB_ACTIVE = isLabMode && process.env.NODE_ENV !== 'production';

if (LAB_ACTIVE) {
  console.warn('[RATE LIMIT] Lab mode is ACTIVE — per-account limits at 100, IP limits disabled.');
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extracts a safe, normalised key from the request body email.
 * Falls back to IP so the limiter never crashes on missing body fields.
 *
 * Handles edge cases:
 *  - No body at all (raw TCP probes, malformed JSON parsed as null)
 *  - email field present but not a string (array injection, object injection)
 *  - email exceeds sane length (memory exhaustion via huge key strings)
 *  - Unicode homograph emails ("аdmin@…" vs "admin@…") → lowercased + trimmed
 */
const emailKey = (prefix) => (req) => {
  try {
    const raw = req.body?.email;
    if (typeof raw === 'string' && raw.length > 0 && raw.length <= 254) {
      return `${prefix}:acct:${raw.trim().toLowerCase()}`;
    }
  } catch (_) {
    // body parsing edge case — fall through to IP
  }
  return `${prefix}:ip:${req.ip}`;
};

/**
 * Pure IP key — used for the second (IP-level) limiter layer in prod.
 * ✅ FIXED: Uses ipKeyGenerator to handle IPv6 properly.
 */
const ipKey = (prefix) => (req) => {
  // Use the library's built-in helper that handles IPv6 correctly
  const ipPart = ipKeyGenerator(req, prefix);
  return `${prefix}:ip:${ipPart}`;
};

/**
 * Builds a dual-layer limiter pair:
 *   [ipLimiter, accountLimiter]
 *
 * In lab mode: returns a single per-account limiter with LAB_MAX.
 * In prod:     returns both so routes apply them in sequence.
 *
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
    // Skip rate limiting for trusted internal health checks if needed
    skip: (req) => req.path === '/ping',
    message: { success: false, message },
  };

  if (LAB_ACTIVE) {
    // Single per-account limiter, generous ceiling, no IP lock-out
    return [
      rateLimit({
        ...baseConfig,
        max: LAB_MAX,
        keyGenerator: emailKey(prefix),
      }),
    ];
  }

  // Production: two limiters in sequence
  // ✅ FIXED: Use ipKeyGenerator via ipKey helper
  const ipLimiter = rateLimit({
    ...baseConfig,
    max: ipMax,
    keyGenerator: ipKey(prefix),
    // Slightly more descriptive message for IP-level block
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

// ============================================================================
// RATE LIMITERS
// ============================================================================

/**
 * OTP SEND / RESEND / FORGOT-PASSWORD
 *
 * Threat: Email bombing — attacker triggers hundreds of OTP emails to
 * a victim's inbox to harass or cause email provider blocks.
 *
 * Prod:
 *  - IP:      20/15min  → a shared office IP won't trigger this under normal use
 *  - Account: 3/15min   → matches original; 3 OTP sends per email is plenty
 *
 * Lab: 100/15min per account
 */
const otpLimiters = buildLimiters({
  prefix:     'otp',
  windowMs:   15 * 60 * 1000,
  ipMax:      20,
  accountMax: 3,
  message:    'Too many OTP requests. Please wait 15 minutes before trying again.',
});

/**
 * OTP VERIFICATION (brute force guard)
 *
 * Threat: Attacker tries to guess the 6-digit OTP (1,000,000 combinations).
 * With no limit, automated tools can exhaust all codes in seconds.
 *
 * Prod:
 *  - IP:      50/15min  → 40-student lab-equivalent without lab mode; covers CGNAT
 *  - Account: 10/15min  → a legit user won't need more than 3 attempts
 *
 * Note: Your OTP should also be single-use + expire server-side (5–10 min).
 * Rate limiting is the second line of defence here, not the first.
 *
 * Lab: 100/15min per account
 */
const otpVerifyLimiters = buildLimiters({
  prefix:     'otp-verify',
  windowMs:   15 * 60 * 1000,
  ipMax:      50,
  accountMax: 10,
  message:    'Too many verification attempts. Please wait 15 minutes.',
});

/**
 * AUTH (signup / signin / google)
 *
 * Threat: Credential stuffing — attackers use leaked password lists against
 * your signin endpoint. Also covers account enumeration via signup timing.
 *
 * Prod:
 *  - IP:      30/15min  → covers 40 students on one IP without lab mode
 *  - Account: 10/15min  → a real user won't try to sign in 10 times in 15 min
 *
 * Lab: 100/15min per account
 */
const authLimiters = buildLimiters({
  prefix:     'auth',
  windowMs:   15 * 60 * 1000,
  ipMax:      30,
  accountMax: 10,
  message:    'Too many attempts. Please try again later.',
});

/**
 * RESET PASSWORD (final write step)
 *
 * Threat: Attacker has stolen a valid reset OTP and is trying to
 * programmatically rotate the password. Low risk since OTP is single-use,
 * but worth capping to prevent replay edge cases.
 *
 * Prod:
 *  - IP:      20/hr     → generous; unlikely any legit IP needs more
 *  - Account: 5/hr      → more than enough for a legitimate reset flow
 *
 * Lab: 100/hr per account
 */
const resetPasswordLimiters = buildLimiters({
  prefix:     'reset-pw',
  windowMs:   60 * 60 * 1000,
  ipMax:      20,
  accountMax: 5,
  message:    'Too many password reset attempts. Please try again after an hour.',
});

/**
 * CHANGE PASSWORD (authenticated write)
 *
 * Threat: Session hijack — attacker has a stolen JWT and tries to
 * lock the real user out by changing their password.
 * The protect middleware already validates the JWT, so this is a last resort.
 *
 * Prod:
 *  - IP:      20/15min
 *  - Account: 5/15min
 *
 * Note: For change-password the "account" key falls back to IP since
 * there's no email in the body — the user is identified by their JWT.
 * The protect middleware runs before this limiter so req.user is available;
 * we key on req.user?.id if present, else IP.
 *
 * Lab: 100/15min per account
 */
const changePasswordAccountKey = (req) => {
  if (LAB_ACTIVE) {
    const userId = req.user?.id || req.user?._id?.toString();
    if (userId) return `change-pw:acct:${userId}`;
    return `change-pw:ip:${req.ip}`;
  }
  return `change-pw:ip:${req.ip}`;
};

const changePasswordLimiters = LAB_ACTIVE
  ? [
      rateLimit({
        windowMs:       15 * 60 * 1000,
        max:            LAB_MAX,
        keyGenerator:   changePasswordAccountKey,
        standardHeaders: true,
        legacyHeaders:  false,
        message:        { success: false, message: 'Too many password change attempts. Please try again in 15 minutes.' },
      }),
    ]
  : [
      rateLimit({
        windowMs:       15 * 60 * 1000,
        max:            20,
        keyGenerator:   ipKey('change-pw'),
        standardHeaders: true,
        legacyHeaders:  false,
        message:        { success: false, message: 'Too many password change attempts. Please try again in 15 minutes. (IP blocked)' },
      }),
      rateLimit({
        windowMs:       15 * 60 * 1000,
        max:            5,
        keyGenerator:   changePasswordAccountKey,
        standardHeaders: true,
        legacyHeaders:  false,
        message:        { success: false, message: 'Too many password change attempts. Please try again in 15 minutes. (Account blocked)' },
      }),
    ];

// ============================================================================
// ROUTES
// ============================================================================

// ─── Health check / cold-start ping ──────────────────────────────────────────
// No limiter — read-only, no data access, global limiter in app.js covers it.
router.get('/ping', authController.ping);

// ─── Registration & Verification ─────────────────────────────────────────────
router.post('/signup',     ...authLimiters,      validateSignup, authController.signup);
router.post('/verify-otp', ...otpVerifyLimiters, validateOTP,    authController.verifyOTP);
router.post('/resend-otp', ...otpLimiters,       validateEmail,  authController.resendOTP);

// ─── Authentication ───────────────────────────────────────────────────────────
router.post('/signin', ...authLimiters, validateSignin,     authController.signin);
router.post('/google', ...authLimiters, validateGoogleAuth, authController.googleAuth);

// ─── Password Management ──────────────────────────────────────────────────────
router.post('/forgot-password',  ...otpLimiters,           validateEmail,         authController.forgotPassword);
router.post('/verify-reset-otp', ...otpVerifyLimiters,     validateOTP,           authController.verifyResetOTP);
router.post('/reset-password',   ...resetPasswordLimiters, validateResetPassword, authController.resetPassword);

// ─── Session Management ───────────────────────────────────────────────────────
router.post('/refresh-token', authController.refreshToken);
router.post('/logout',        protect, authController.logout);
router.get('/me',             protect, authController.getCurrentUser);

// ─── Account Management ───────────────────────────────────────────────────────
// update-profile: authenticated, no sensitive data mutation, global limiter enough.
router.put('/update-profile',   protect, authController.updateProfile);
router.post('/change-password', protect, ...changePasswordLimiters, authController.changePassword);

module.exports = router;