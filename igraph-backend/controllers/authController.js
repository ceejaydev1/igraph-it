// igraph-backend/controllers/authController.js

const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { db, auth } = require('../config/firebase');

const userModel = require('../models/userModel');
const otpModel  = require('../models/otpModel');
const { generateOTP, getOTPExpiry }                                         = require('../utils/generateOTP');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, verifyAccessToken } = require('../utils/generateJWT');
const { sendVerificationEmail, sendPasswordResetEmail }                     = require('../services/emailService');

// ============================================================================
// ENVIRONMENT FLAGS
// ============================================================================

const IS_DEV        = process.env.NODE_ENV === 'development';
const LAB_ACTIVE    = process.env.IS_LAB_MODE === 'true' && !IS_DEV === false
                      && process.env.NODE_ENV !== 'production';

// ============================================================================
// ENCRYPTION HELPERS (for plaintextPassword in pending_users)
//
// WHY: Firestore is at-rest encrypted by Google, but if a service account key
// leaks or an insider reads the collection, plaintextPassword is immediately
// usable. AES-256-CBC adds a second layer — the key lives only in .env.
//
// .env requirement:
//   PENDING_USER_ENCRYPTION_KEY=<64 hex chars>  (32 bytes)
//
// Generate with:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// ============================================================================

const ENCRYPTION_KEY_HEX = process.env.PENDING_USER_ENCRYPTION_KEY;

/**
 * Encrypts a plaintext string with AES-256-CBC.
 * Returns "ivHex:encryptedHex" or throws if the key is missing/wrong length.
 */
const encryptValue = (plaintext) => {
  if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
    throw new Error('PENDING_USER_ENCRYPTION_KEY is missing or not 64 hex characters.');
  }
  const key = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
  const iv  = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Decrypts a value produced by encryptValue.
 * Returns the original plaintext string, or throws on bad input.
 */
const decryptValue = (encrypted) => {
  if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
    throw new Error('PENDING_USER_ENCRYPTION_KEY is missing or not 64 hex characters.');
  }
  const [ivHex, encHex] = encrypted.split(':');
  if (!ivHex || !encHex) throw new Error('Invalid encrypted format.');
  const key      = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
  const iv       = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final()
  ]).toString('utf8');
};

// ============================================================================
// PASSWORD VALIDATION HELPER
//
// Single source of truth — used by signup (via frontend validation parity),
// resetPassword, and changePassword so all three enforce the same rules.
// ============================================================================

const PASSWORD_SPECIAL = /[!@#$%^&*(),.?":{}|<>]/;

/**
 * Returns null if the password is valid, or an error message string if not.
 */
const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') return 'Password is required.';
  if (password.length < 8)          return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password))      return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password))      return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password))      return 'Password must contain at least one number.';
  if (!PASSWORD_SPECIAL.test(password)) return 'Password must contain at least one special character (!@#$%^&* etc.).';
  return null;
};

// ============================================================================
// PER-EMAIL OTP RATE LIMITER (Firestore-backed, second layer after route limiter)
//
// Counts OTP documents created for a given email+purpose within the rolling
// window. Falls open on Firestore errors so users are never locked out by
// infrastructure failures.
// ============================================================================

const isEmailOTPRateLimited = async (email, purpose, maxRequests = 3, windowMinutes = 15) => {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    const snapshot = await db.collection('otps')
      .where('email',      '==', email)
      .where('purpose',    '==', purpose)
      .where('created_at', '>=', windowStart)
      .get();
    return snapshot.size >= maxRequests;
  } catch (err) {
    console.error('[isEmailOTPRateLimited] Firestore error — failing open:', err.message);
    return false;
  }
};

// ============================================================================
// PING  (cold-start wake-up for free-tier hosting)
// ============================================================================

const ping = async (req, res) => {
  res.status(200).json({ success: true, message: 'pong' });
};

// ============================================================================
// SIGN UP
// ============================================================================

const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // ── Basic presence check ──────────────────────────────────────────────────
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and password are required.'
      });
    }

    // ── Password strength (backend is source of truth) ────────────────────────
    const pwError = validatePasswordStrength(password);
    if (pwError) {
      return res.status(400).json({ success: false, message: pwError });
    }

    // ── Duplicate account check ───────────────────────────────────────────────
    const existingUser = await userModel.getUserByEmail(email);
    if (existingUser) {
      if (existingUser.auth_provider === 'google') {
        return res.status(409).json({
          success: false,
          message: 'This email is registered with Google. Please sign in with Google instead.',
          code: 'GOOGLE_ACCOUNT'
        });
      }
      return res.status(409).json({
        success: false,
        message: 'This email is already registered. Please sign in or use a different email.'
      });
    }

    // ── Per-email OTP rate limit ───────────────────────────────────────────────
    const rateLimited = await isEmailOTPRateLimited(email, 'signup');
    if (rateLimited) {
      return res.status(429).json({
        success: false,
        message: 'Too many signup attempts for this email. Please wait 15 minutes before trying again.',
        code: 'EMAIL_RATE_LIMITED'
      });
    }

    // ── Hash password + encrypt plaintext for pending storage ─────────────────
    const saltRounds    = 12;
    const passwordHash  = await bcrypt.hash(password, saltRounds);
    const tempUserId    = uuidv4();

    let encryptedPassword;
    try {
      encryptedPassword = encryptValue(password);
    } catch (encErr) {
      console.error('[signup] Encryption failed:', encErr.message);
      return res.status(500).json({
        success: false,
        message: 'Server configuration error. Please contact support.'
      });
    }

    // ── Store pending registration ─────────────────────────────────────────────
    // plaintextPassword is no longer stored in the clear — stored encrypted.
    const pendingUserData = {
      fullName,
      email,
      passwordHash,
      encryptedPassword,           // AES-256-CBC encrypted, key in .env
      tempUserId,
      createdAt: new Date().toISOString(),
      expiresAt: getOTPExpiry(10).toISOString()
    };

    await db.collection('pending_users').doc(tempUserId).set(pendingUserData);

    // ── Generate + send OTP ───────────────────────────────────────────────────
    const otp       = generateOTP();
    const otpExpiry = getOTPExpiry(5);

    await otpModel.invalidateAllOTPsByEmail(email, 'signup');
    await otpModel.createOTPWithEmail(email, otp, 'signup', otpExpiry, tempUserId);
    await sendVerificationEmail(email, fullName, otp);

    res.status(201).json({
      success: true,
      message: 'Verification code sent! Please check your email to complete registration.',
      data: {
        email,
        tempId: tempUserId,
        ...(IS_DEV && { debug_otp: otp })
      }
    });

  } catch (error) {
    console.error('[signup] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup. Please try again.'
    });
  }
};

// ============================================================================
// VERIFY OTP  (registration)
// ============================================================================

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP code are required.'
      });
    }

    // ── 1. Find pending registration ──────────────────────────────────────────
    const pendingSnapshot = await db.collection('pending_users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (pendingSnapshot.empty) {
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser && existingUser.is_verified) {
        return res.status(400).json({
          success: false,
          message: 'This account is already verified. Please sign in.',
          code: 'ALREADY_VERIFIED'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'No pending registration found for this email. Please sign up again.',
        code: 'NO_PENDING_REGISTRATION'
      });
    }

    const pendingDoc  = pendingSnapshot.docs[0];
    const pendingUser = pendingDoc.data();

    // ── 2. Check pending session expiry ───────────────────────────────────────
    if (new Date(pendingUser.expiresAt) < new Date()) {
      await pendingDoc.ref.delete();
      return res.status(400).json({
        success: false,
        message: 'Registration session expired. Please sign up again.',
        code: 'SESSION_EXPIRED'
      });
    }

    // ── 3. Validate OTP ───────────────────────────────────────────────────────
    const validOTP = await otpModel.getValidOTPByEmail(email, 'signup');

    if (!validOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or is invalid. Please request a new OTP.',
        code: 'OTP_EXPIRED'
      });
    }

    // Constant-time comparison to prevent timing attacks on OTP codes
    const otpMatch = crypto.timingSafeEqual(
      Buffer.from(validOTP.otp_code.toString().padStart(6, '0')),
      Buffer.from(otp.toString().padStart(6, '0'))
    );

    if (!otpMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP code. Please check your email and try again.',
        code: 'OTP_INCORRECT'
      });
    }

    // ── 4. Race condition guard: email registered mid-flow ────────────────────
    const existingUser = await userModel.getUserByEmail(email);
    if (existingUser) {
      await pendingDoc.ref.delete();
      await otpModel.markOTPUsed(validOTP.otp_id);
      return res.status(409).json({
        success: false,
        message: 'Email was already registered. Please sign in.',
        code: 'ALREADY_REGISTERED'
      });
    }

    // ── 5. Decrypt password ───────────────────────────────────────────────────
    let plaintextPassword;
    try {
      plaintextPassword = decryptValue(pendingUser.encryptedPassword);
    } catch (decErr) {
      console.error('[verifyOTP] Decryption failed for', email, ':', decErr.message);
      await pendingDoc.ref.delete();
      return res.status(400).json({
        success: false,
        message: 'Account data corrupted or expired. Please sign up again.',
        code: 'DATA_CORRUPTED'
      });
    }

    // ── 6. Create Firebase Auth user ──────────────────────────────────────────
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email,
        password: plaintextPassword,
        displayName: pendingUser.fullName,
        emailVerified: true
      });
    } catch (firebaseError) {
      console.error('[verifyOTP] Firebase Auth error:', firebaseError.code, firebaseError.message);

      if (firebaseError.code === 'auth/email-already-exists') {
        // Edge case: Firebase user exists but Firestore user doesn't — recover gracefully
        try {
          firebaseUser = await auth.getUserByEmail(email);
          console.warn('[verifyOTP] Firebase user already existed, reusing uid:', firebaseUser.uid);
        } catch (lookupError) {
          console.error('[verifyOTP] Firebase lookup failed:', lookupError.message);
          return res.status(500).json({
            success: false,
            message: 'Failed to create account. Please try again.',
            code: 'FIREBASE_ERROR'
          });
        }
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to create account. Please try again.',
          code: 'FIREBASE_ERROR'
        });
      }
    }

    // ── 7. Store user in Firestore ────────────────────────────────────────────
    await userModel.createUser(firebaseUser.uid, {
      fullName:    pendingUser.fullName,
      email,
      passwordHash: pendingUser.passwordHash,
      isVerified:  true,
      authProvider: 'email'
    });

    // ── 8. Cleanup ────────────────────────────────────────────────────────────
    await otpModel.markOTPUsed(validOTP.otp_id);
    await pendingDoc.ref.delete();

    console.log(`✅ Account created for ${email} (uid: ${firebaseUser.uid})`);

    res.status(200).json({
      success: true,
      message: 'Email verified and account created successfully! You can now sign in.'
    });

  } catch (error) {
    console.error('[verifyOTP] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification. Please try again.',
      code: 'SERVER_ERROR'
    });
  }
};

// ============================================================================
// RESEND OTP
// ============================================================================

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const pendingSnapshot = await db.collection('pending_users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (pendingSnapshot.empty) {
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser && existingUser.is_verified) {
        return res.status(400).json({
          success: false,
          message: 'This account is already verified. Please sign in.'
        });
      }
      // Return 200 to prevent email enumeration — caller cannot tell if email exists
      return res.status(200).json({
        success: true,
        message: 'If this email exists in our system, a new OTP has been sent.'
      });
    }

    // ── Per-email OTP rate limit ───────────────────────────────────────────────
    const rateLimited = await isEmailOTPRateLimited(email, 'signup');
    if (rateLimited) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests for this email. Please wait 15 minutes before trying again.',
        code: 'EMAIL_RATE_LIMITED'
      });
    }

    const pendingUser = pendingSnapshot.docs[0].data();

    await otpModel.invalidateAllOTPsByEmail(email, 'signup');

    const otp       = generateOTP();
    const otpExpiry = getOTPExpiry(5);
    await otpModel.createOTPWithEmail(email, otp, 'signup', otpExpiry, pendingUser.tempUserId);
    await sendVerificationEmail(email, pendingUser.fullName, otp);

    res.status(200).json({
      success: true,
      message: 'A new verification code has been sent to your email.',
      ...(IS_DEV && { debug_otp: otp })
    });

  } catch (error) {
    console.error('[resendOTP] Error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ============================================================================
// SIGN IN
// ============================================================================

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await userModel.getUserByEmail(email);

    // Use generic message to avoid confirming whether the email is registered
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.auth_provider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In. Please sign in with Google.',
        code: 'GOOGLE_ACCOUNT'
      });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const accessToken  = generateAccessToken(user.user_id, user.email);
    const refreshToken = generateRefreshToken(user.user_id);

    const sessionId     = uuidv4();
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 7);

    await db.collection('sessions').doc(sessionId).set({
      session_id:   sessionId,
      user_id:      user.user_id,
      refresh_token: refreshToken,
      device_info:  req.headers['user-agent'] || 'unknown',
      ip_address:   req.ip,
      created_at:   new Date().toISOString(),
      expires_at:   sessionExpiry.toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Sign in successful!',
      data: {
        user: {
          uid:            user.user_id,
          fullName:       user.full_name,
          email:          user.email,
          profilePicture: user.profile_picture || null,
          authProvider:   user.auth_provider
        },
        tokens: { accessToken, refreshToken }
      }
    });

  } catch (error) {
    console.error('[signin] Error:', error);
    res.status(500).json({ success: false, message: 'Server error during sign in. Please try again.' });
  }
};

// ============================================================================
// GOOGLE AUTH
// ============================================================================

const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'No ID token provided.' });
    }

    // ── Verify the Google ID token with Firebase Admin ────────────────────────
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (err) {
      console.error('[googleAuth] Token verification failed:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token. Please try again.'
      });
    }

    const { uid, email, name, picture } = decodedToken;

    // ── Block if the email is already registered with email/password ──────────
    const existingUserByEmail = await userModel.getUserByEmail(email);
    if (existingUserByEmail && existingUserByEmail.auth_provider !== 'google') {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered with email/password. Please sign in using your email and password instead.',
        code: 'EMAIL_ACCOUNT_EXISTS'
      });
    }

    // ── Create Firestore user if first Google sign-in ─────────────────────────
    let user = await userModel.getUserById(uid);
    if (!user) {
      await userModel.createUser(uid, {
        fullName:       name || 'Google User',
        email,
        passwordHash:   null,
        isVerified:     true,
        profilePicture: picture || null,
        authProvider:   'google'
      });
      user = await userModel.getUserById(uid);
    }

    const accessToken  = generateAccessToken(uid, email);
    const refreshToken = generateRefreshToken(uid);

    const sessionId     = uuidv4();
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 7);

    await db.collection('sessions').doc(sessionId).set({
      session_id:    sessionId,
      user_id:       uid,
      refresh_token: refreshToken,
      device_info:   req.headers['user-agent'] || 'unknown',
      ip_address:    req.ip,
      created_at:    new Date().toISOString(),
      expires_at:    sessionExpiry.toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Google sign in successful!',
      data: {
        user: {
          uid:            user.user_id,
          fullName:       user.full_name,
          email:          user.email,
          profilePicture: user.profile_picture || null,
          authProvider:   user.auth_provider
        },
        tokens: { accessToken, refreshToken }
      }
    });

  } catch (error) {
    console.error('[googleAuth] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google authentication.'
    });
  }
};

// ============================================================================
// FORGOT PASSWORD
// ============================================================================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your email address.'
      });
    }

    // ── ALWAYS return 200 regardless of whether the email exists ──────────────
    // This prevents email enumeration — an attacker calling this in bulk
    // cannot tell which emails are registered based on the response.
    // Legitimate users who mistype their email will notice they never get
    // an email and can try again.
    const VAGUE_OK = {
      success: true,
      message: 'If an account exists with this email, a reset code has been sent.'
    };

    const user = await userModel.getUserByEmail(email);

    if (!user) {
      console.log(`[forgotPassword] Reset attempted for non-existent email: ${email}`);
      return res.status(200).json(VAGUE_OK);
    }

    if (user.auth_provider === 'google') {
      // Still return 200 — don't confirm the email exists via a different message
      console.log(`[forgotPassword] Google account attempted reset: ${email}`);
      return res.status(200).json(VAGUE_OK);
    }

    if (!user.is_verified) {
      // Still return 200 for the same reason
      console.log(`[forgotPassword] Unverified account attempted reset: ${email}`);
      return res.status(200).json(VAGUE_OK);
    }

    // ── Per-email OTP rate limit ───────────────────────────────────────────────
    const rateLimited = await isEmailOTPRateLimited(email, 'reset');
    if (rateLimited) {
      return res.status(429).json({
        success: false,
        message: 'Too many password reset requests for this email. Please wait 15 minutes before trying again.',
        code: 'EMAIL_RATE_LIMITED'
      });
    }

    await otpModel.invalidateAllOTPs(user.user_id, 'reset');
    const otp       = generateOTP();
    const otpExpiry = getOTPExpiry(5);
    await otpModel.createOTP(user.user_id, otp, 'reset', otpExpiry);

    try {
      await sendPasswordResetEmail(email, user.full_name, otp);
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('[forgotPassword] Email send failed:', emailError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset code. Please try again later.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a reset code has been sent.',
      ...(IS_DEV && { debug_otp: otp })
    });

  } catch (error) {
    console.error('[forgotPassword] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to process your request. Please try again later.'
    });
  }
};

// ============================================================================
// VERIFY RESET OTP
//
// On success, issues a short-lived signed resetToken instead of passing the
// raw OTP to the frontend. resetPassword then validates the token — not the
// OTP — so the OTP cannot be replayed or shared between steps.
// ============================================================================

const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP code are required.'
      });
    }

    const user = await userModel.getUserByEmail(email);
    if (!user) {
      // Return 404 here — at this point the caller already knows the email
      // (they entered it on the forgot-password screen and received the vague 200).
      // Returning 404 helps the frontend guide the user correctly.
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
        code: 'EMAIL_NOT_FOUND'
      });
    }

    if (user.auth_provider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In. Password reset is not available.',
        code: 'GOOGLE_ACCOUNT'
      });
    }

    const validOTP = await otpModel.getValidOTP(user.user_id, 'reset');

    if (!validOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
        code: 'OTP_EXPIRED'
      });
    }

    // Constant-time comparison to prevent timing attacks
    const otpMatch = crypto.timingSafeEqual(
      Buffer.from(validOTP.otp_code.toString().padStart(6, '0')),
      Buffer.from(otp.toString().padStart(6, '0'))
    );

    if (!otpMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP code. Please check your email and try again.',
        code: 'OTP_INCORRECT'
      });
    }

    // ── Mark OTP used immediately — no replay even if reset-password is slow ──
    await otpModel.markOTPUsed(validOTP.otp_id);

    // ── Issue a short-lived reset token (10 min) ──────────────────────────────
    // reset-password will verify this token instead of the raw OTP,
    // so the OTP is single-use and cannot be extracted from the frontend state.
    const resetToken = generateAccessToken(user.user_id, user.email, '10m');

    res.status(200).json({
      success: true,
      message: 'OTP verified. You may now reset your password.',
      data: { email, resetToken }
    });

  } catch (error) {
    console.error('[verifyResetOTP] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to verify OTP. Please try again.',
      code: 'SERVER_ERROR'
    });
  }
};

// ============================================================================
// RESET PASSWORD
//
// Accepts the resetToken issued by verifyResetOTP instead of a raw OTP.
// This prevents OTP replay and ensures the verify → reset steps are bound
// to the same user session.
// ============================================================================

const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset token, and new password are required.'
      });
    }

    // ── Validate reset token ──────────────────────────────────────────────────
    let decoded;
    try {
      decoded = verifyAccessToken(resetToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Reset session expired or invalid. Please restart the password reset process.',
        code: 'RESET_TOKEN_INVALID'
      });
    }

    // ── Ensure token belongs to the claimed email ─────────────────────────────
    if (decoded.email !== email) {
      return res.status(401).json({
        success: false,
        message: 'Reset token does not match the provided email.',
        code: 'RESET_TOKEN_MISMATCH'
      });
    }

    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
        code: 'EMAIL_NOT_FOUND'
      });
    }

    // ── Ensure uid in token matches Firestore user ────────────────────────────
    if (decoded.uid !== user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'Reset token does not match this account.',
        code: 'RESET_TOKEN_MISMATCH'
      });
    }

    if (user.auth_provider !== 'email') {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In. Password reset is not available.',
        code: 'GOOGLE_ACCOUNT'
      });
    }

    // ── Password strength (same rules as signup + changePassword) ─────────────
    const pwError = validatePasswordStrength(newPassword);
    if (pwError) {
      return res.status(400).json({ success: false, message: pwError });
    }

    // ── Guard: prevent setting the same password ──────────────────────────────
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password.',
        code: 'SAME_PASSWORD'
      });
    }

    // ── Hash + persist ────────────────────────────────────────────────────────
    const saltRounds     = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    await userModel.updatePasswordHash(user.user_id, newPasswordHash);

    // ── Sync to Firebase Auth (best-effort, non-fatal) ────────────────────────
    try {
      await auth.updateUser(user.user_id, { password: newPassword });
      console.log(`✅ Firebase Auth password updated for ${email}`);
    } catch (firebaseError) {
      console.error('[resetPassword] Firebase Auth update error:', firebaseError.message);
      // Firestore is source of truth — continue even if Firebase sync fails
    }

    // ── Invalidate all sessions (force re-login everywhere) ───────────────────
    const sessionsSnapshot = await db.collection('sessions')
      .where('user_id', '==', user.user_id)
      .get();

    if (!sessionsSnapshot.empty) {
      const batch = db.batch();
      sessionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    console.log(`✅ Password reset successful for ${email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! Please sign in with your new password.'
    });

  } catch (error) {
    console.error('[resetPassword] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to reset password. Please try again later.'
    });
  }
};

// ============================================================================
// REFRESH TOKEN
// ============================================================================

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }

    // ── Verify JWT signature + expiry ─────────────────────────────────────────
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please sign in again.'
      });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type.'
      });
    }

    // ── Validate session exists in Firestore ──────────────────────────────────
    const sessionSnapshot = await db.collection('sessions')
      .where('user_id',      '==', decoded.uid)
      .where('refresh_token', '==', token)
      .limit(1)
      .get();

    if (sessionSnapshot.empty) {
      return res.status(401).json({
        success: false,
        message: 'Session not found. Please sign in again.'
      });
    }

    // ── Check session expiry ──────────────────────────────────────────────────
    const session = sessionSnapshot.docs[0].data();
    if (new Date(session.expires_at) < new Date()) {
      await sessionSnapshot.docs[0].ref.delete();
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please sign in again.',
        code: 'SESSION_EXPIRED'
      });
    }

    // ── Verify user still exists ──────────────────────────────────────────────
    const user = await userModel.getUserById(decoded.uid);
    if (!user) {
      await sessionSnapshot.docs[0].ref.delete();
      return res.status(401).json({
        success: false,
        message: 'User not found.'
      });
    }

    const newAccessToken = generateAccessToken(user.user_id, user.email);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: { accessToken: newAccessToken }
    });

  } catch (error) {
    console.error('[refreshToken] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// ============================================================================
// LOGOUT
// ============================================================================

const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      const sessionSnapshot = await db.collection('sessions')
        .where('user_id',      '==', req.user.uid)
        .where('refresh_token', '==', token)
        .limit(1)
        .get();

      if (!sessionSnapshot.empty) {
        await sessionSnapshot.docs[0].ref.delete();
      }
    }

    // Always 200 — even if the token wasn't found, the user's intent is fulfilled
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });

  } catch (error) {
    console.error('[logout] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout.'
    });
  }
};

// ============================================================================
// GET CURRENT USER
// ============================================================================

const getCurrentUser = async (req, res) => {
  try {
    const user = await userModel.getUserById(req.user.uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          uid:            user.user_id,
          fullName:       user.full_name,
          email:          user.email,
          profilePicture: user.profile_picture || null,
          authProvider:   user.auth_provider
        }
      }
    });
  } catch (error) {
    console.error('[getCurrentUser] Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================================================
// UPDATE PROFILE
// ============================================================================

const updateProfile = async (req, res) => {
  try {
    const userId    = req.user.uid;
    const { fullName } = req.body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters.'
      });
    }

    // Sanitise — strip leading/trailing whitespace and collapse internal spaces
    const sanitisedName = fullName.trim().replace(/\s+/g, ' ');

    await db.collection('students').doc(userId).update({
      full_name:  sanitisedName,
      updated_at: new Date().toISOString()
    });

    const updatedUser = await userModel.getUserById(userId);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          uid:            updatedUser.user_id,
          fullName:       updatedUser.full_name,
          email:          updatedUser.email,
          profilePicture: updatedUser.profile_picture || null,
          authProvider:   updatedUser.auth_provider
        }
      }
    });

  } catch (error) {
    console.error('[updateProfile] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile. Please try again.'
    });
  }
};

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.uid;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required.'
      });
    }

    // ── Password strength (shared helper) ─────────────────────────────────────
    const pwError = validatePasswordStrength(newPassword);
    if (pwError) {
      return res.status(400).json({ success: false, message: pwError });
    }

    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.auth_provider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'Google users cannot change password. Please use Google Sign-In.'
      });
    }

    // ── Verify current password ───────────────────────────────────────────────
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // ── Guard: prevent setting the same password ──────────────────────────────
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password.',
        code: 'SAME_PASSWORD'
      });
    }

    // ── Hash + persist ────────────────────────────────────────────────────────
    const saltRounds     = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    await userModel.updatePasswordHash(userId, newPasswordHash);

    // ── Sync to Firebase Auth (best-effort, non-fatal) ────────────────────────
    try {
      await auth.updateUser(userId, { password: newPassword });
      console.log(`✅ Firebase Auth password changed for uid: ${userId}`);
    } catch (firebaseError) {
      console.error('[changePassword] Firebase Auth update error:', firebaseError.message);
    }

    // ── Invalidate all sessions (force re-login everywhere) ───────────────────
    const sessionsSnapshot = await db.collection('sessions')
      .where('user_id', '==', userId)
      .get();

    if (!sessionsSnapshot.empty) {
      const batch = db.batch();
      sessionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please sign in again.'
    });

  } catch (error) {
    console.error('[changePassword] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password. Please try again.'
    });
  }
};

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
  ping,
  signup,
  verifyOTP,
  resendOTP,
  signin,
  googleAuth,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  refreshToken,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword,
};