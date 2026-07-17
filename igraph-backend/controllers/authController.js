const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db, auth } = require('../config/firebase');

const userModel = require('../models/userModel');
const otpModel = require('../models/otpModel');
const { generateOTP, getOTPExpiry } = require('../utils/generateOTP');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateJWT');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

// HELPERS

/**
 * Per-email OTP rate limiter.
 * Checks how many OTPs were created for a given email + purpose in the last
 * windowMinutes. Returns true (blocked) if the count hits maxRequests.
 *
 * Uses the existing `otps` Firestore collection so no new infrastructure needed.
 *
 * @param {string} email
 * @param {string} purpose  'signup' | 'reset'
 * @param {number} maxRequests  Max OTPs allowed within the window (default 3)
 * @param {number} windowMinutes  Rolling window in minutes (default 15)
 * @returns {Promise<boolean>}  true = rate limited, false = OK to proceed
 */
const isEmailOTPRateLimited = async (email, purpose, maxRequests = 3, windowMinutes = 15) => {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const snapshot = await db.collection('otps')
      .where('email', '==', email)
      .where('purpose', '==', purpose)
      .where('created_at', '>=', windowStart)
      .get();

    return snapshot.size >= maxRequests;
  } catch (err) {
    // If the check itself fails, fail open (don't block the user)
    console.error('isEmailOTPRateLimited error:', err.message);
    return false;
  }
};

// PING (cold-start wake-up for free-tier hosting)

const ping = async (req, res) => {
  res.status(200).json({ success: true, message: 'pong' });
};

// SIGN UP

const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and password are required.'
      });
    }

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

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const tempUserId = uuidv4();

    const pendingUserData = {
      fullName,
      email,
      passwordHash,
      plaintextPassword: password,
      tempUserId,
      createdAt: new Date().toISOString(),
      expiresAt: getOTPExpiry(10).toISOString()
    };

    await db.collection('pending_users').doc(tempUserId).set(pendingUserData);

    const otp = generateOTP();
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
        ...(process.env.NODE_ENV === 'development' && { debug_otp: otp })
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup. Please try again.'
    });
  }
};

// VERIFY OTP

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

    const pendingDoc = pendingSnapshot.docs[0];
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

    if (validOTP.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP code. Please check your email and try again.',
        code: 'OTP_INCORRECT'
      });
    }

    // ── 4. Guard: check if email was already registered mid-flow ──────────────
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

    // ── 5. Retrieve plaintext password ────────────────────────────────────────
    const plaintextPassword = pendingUser.plaintextPassword;

    if (!plaintextPassword) {
      console.error('verifyOTP: plaintextPassword missing for', email);
      return res.status(400).json({
        success: false,
        message: 'Account data corrupted. Please sign up again.',
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
      console.error('Firebase Auth creation error:', firebaseError.code, firebaseError.message);

      if (firebaseError.code === 'auth/email-already-exists') {
        try {
          firebaseUser = await auth.getUserByEmail(email);
          console.warn('verifyOTP: Firebase user already existed, reusing uid:', firebaseUser.uid);
        } catch (lookupError) {
          console.error('verifyOTP: Could not look up existing Firebase user:', lookupError.message);
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
      fullName: pendingUser.fullName,
      email,
      passwordHash: pendingUser.passwordHash,
      isVerified: true,
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
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification. Please try again.',
      code: 'SERVER_ERROR'
    });
  }
};

// RESEND OTP

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
      // Return 200 to prevent email enumeration
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

    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(5);
    await otpModel.createOTPWithEmail(email, otp, 'signup', otpExpiry, pendingUser.tempUserId);

    await sendVerificationEmail(email, pendingUser.fullName, otp);

    res.status(200).json({
      success: true,
      message: 'A new verification code has been sent to your email.',
      ...(process.env.NODE_ENV === 'development' && { debug_otp: otp })
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// SIGN IN

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await userModel.getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.auth_provider === 'google' && !user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In. Please sign in with Google, or set a password from your Account settings.',
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

    const accessToken = generateAccessToken(user.user_id, user.email);
    const refreshToken = generateRefreshToken(user.user_id);

    const sessionId = uuidv4();
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 7);

    await db.collection('sessions').doc(sessionId).set({
      session_id: sessionId,
      user_id: user.user_id,
      refresh_token: refreshToken,
      device_info: req.headers['user-agent'] || 'unknown',
      created_at: new Date().toISOString(),
      expires_at: sessionExpiry.toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Sign in successful!',
      data: {
        user: {
          uid: user.user_id,
          fullName: user.full_name,
          email: user.email,
          profilePicture: user.profile_picture || null,
          authProvider: user.auth_provider,
          hasPassword: !!user.password_hash
        },
        tokens: { accessToken, refreshToken }
      }
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ success: false, message: 'Server error during sign in. Please try again.' });
  }
};

// GOOGLE AUTH

const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'No ID token provided.' });
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token. Please try again.'
      });
    }

    const { uid, email, name, picture } = decodedToken;

    const existingUserByEmail = await userModel.getUserByEmail(email);

    if (existingUserByEmail) {
      // Already Google-capable (signed up via Google originally, or linked
      // their password account to Google previously) — sign in as this
      // existing user rather than creating a second doc under the Google uid.
      const googleCapable = existingUserByEmail.auth_provider === 'google' || existingUserByEmail.google_linked === true;

      if (!googleCapable) {
        return res.status(409).json({
          success: false,
          message: 'This email already has a password-based account. Enter your password to link your Google sign-in.',
          code: 'LINK_PASSWORD_REQUIRED'
        });
      }

      const accessToken = generateAccessToken(existingUserByEmail.user_id, existingUserByEmail.email);
      const refreshToken = generateRefreshToken(existingUserByEmail.user_id);

      const sessionId = uuidv4();
      const sessionExpiry = new Date();
      sessionExpiry.setDate(sessionExpiry.getDate() + 7);

      await db.collection('sessions').doc(sessionId).set({
        session_id: sessionId,
        user_id: existingUserByEmail.user_id,
        refresh_token: refreshToken,
        device_info: req.headers['user-agent'] || 'unknown',
        created_at: new Date().toISOString(),
        expires_at: sessionExpiry.toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Google sign in successful!',
        data: {
          user: {
            uid: existingUserByEmail.user_id,
            fullName: existingUserByEmail.full_name,
            email: existingUserByEmail.email,
            profilePicture: existingUserByEmail.profile_picture || null,
            authProvider: existingUserByEmail.auth_provider,
            hasPassword: !!existingUserByEmail.password_hash
          },
          tokens: { accessToken, refreshToken }
        }
      });
    }

    // No account at all for this email yet — brand-new Google-only signup.
    await userModel.createUser(uid, {
      fullName: name || 'Google User',
      email,
      passwordHash: null,
      isVerified: true,
      profilePicture: picture || null,
      authProvider: 'google'
    });

    const user = await userModel.getUserById(uid);

    const accessToken = generateAccessToken(uid, email);
    const refreshToken = generateRefreshToken(uid);

    const sessionId = uuidv4();
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 7);

    await db.collection('sessions').doc(sessionId).set({
      session_id: sessionId,
      user_id: uid,
      refresh_token: refreshToken,
      device_info: req.headers['user-agent'] || 'unknown',
      created_at: new Date().toISOString(),
      expires_at: sessionExpiry.toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Google sign in successful!',
      data: {
        user: {
          uid: user.user_id,
          fullName: user.full_name,
          email: user.email,
          profilePicture: user.profile_picture || null,
          authProvider: user.auth_provider,
          hasPassword: false
        },
        tokens: { accessToken, refreshToken }
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google authentication.'
    });
  }
};

// LINK GOOGLE ACCOUNT
// An email/password user signing in with Google for the first time lands
// here (via the LINK_PASSWORD_REQUIRED response above) — confirming their
// existing password proves they own the account before we let Google sign
// them into it going forward.

const linkGoogleAccount = async (req, res) => {
  try {
    const { idToken, password } = req.body;

    if (!idToken || !password) {
      return res.status(400).json({
        success: false,
        message: 'ID token and password are required.'
      });
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token. Please try again.'
      });
    }

    const { email } = decodedToken;
    const user = await userModel.getUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found for this email.'
      });
    }

    const alreadyGoogleCapable = user.auth_provider === 'google' || user.google_linked === true;

    if (!alreadyGoogleCapable) {
      if (!user.password_hash) {
        return res.status(400).json({
          success: false,
          message: 'This account has no password set. Please sign in with Google directly.'
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password.'
        });
      }

      await userModel.updateUser(user.user_id, { google_linked: true });
    }

    const accessToken = generateAccessToken(user.user_id, user.email);
    const refreshToken = generateRefreshToken(user.user_id);

    const sessionId = uuidv4();
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 7);

    await db.collection('sessions').doc(sessionId).set({
      session_id: sessionId,
      user_id: user.user_id,
      refresh_token: refreshToken,
      device_info: req.headers['user-agent'] || 'unknown',
      created_at: new Date().toISOString(),
      expires_at: sessionExpiry.toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Google account linked successfully!',
      data: {
        user: {
          uid: user.user_id,
          fullName: user.full_name,
          email: user.email,
          profilePicture: user.profile_picture || null,
          authProvider: user.auth_provider,
          hasPassword: !!user.password_hash
        },
        tokens: { accessToken, refreshToken }
      }
    });

  } catch (error) {
    console.error('Link Google account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while linking your Google account.'
    });
  }
};

// FORGOT PASSWORD

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your email address.'
      });
    }

    const user = await userModel.getUserByEmail(email);

    if (!user) {
      console.log(`🔴 Password reset attempted for non-existent email: ${email}`);
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
        code: 'EMAIL_NOT_FOUND'
      });
    }

    if (user.auth_provider === 'google' && !user.password_hash) {
      console.log(`🔴 Google-only account detected for ${email} - blocking password reset`);
      return res.status(400).json({
        success: false,
        message: 'This email is linked to a Google account with no password set. Please sign in with Google, or set a password first from your Account settings.',
        code: 'GOOGLE_ACCOUNT'
      });
    }

    if (!user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email address first.',
        code: 'EMAIL_NOT_VERIFIED'
      });
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
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(5);
    await otpModel.createOTP(user.user_id, otp, 'reset', otpExpiry);

    try {
      await sendPasswordResetEmail(email, user.full_name, otp);
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Password reset email failed:', emailError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset code. Please try again later.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'A password reset code has been sent to your email.',
      ...(process.env.NODE_ENV === 'development' && { debug_otp: otp })
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to process your request. Please try again later.'
    });
  }
};


// VERIFY RESET OTP


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
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
        code: 'EMAIL_NOT_FOUND'
      });
    }

    if (user.auth_provider === 'google' && !user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In and has no password set. Password reset is not available.',
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

    if (validOTP.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP code. Please check your email and try again.',
        code: 'OTP_INCORRECT'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified. You may now reset your password.',
      data: { email }
    });

  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to verify OTP. Please try again.',
      code: 'SERVER_ERROR'
    });
  }
};

// RESET PASSWORD

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required.'
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

    if (user.auth_provider !== 'email' && !user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In. Password reset is not available.'
      });
    }

    const validOTP = await otpModel.getValidOTP(user.user_id, 'reset');
    if (!validOTP || validOTP.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please restart the password reset process.',
        code: 'OTP_INVALID'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await userModel.updatePasswordHash(user.user_id, newPasswordHash);

    try {
      await auth.updateUser(user.user_id, { password: newPassword });
      console.log(`✅ Firebase Auth password updated for ${email}`);
    } catch (firebaseError) {
      console.error('Firebase Auth password update error:', firebaseError.message);
      // Non-fatal — Firestore is source of truth for our auth
    }

    // Invalidate all sessions
    const sessionsSnapshot = await db.collection('sessions')
      .where('user_id', '==', user.user_id)
      .get();

    const batch = db.batch();
    sessionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    await otpModel.markOTPUsed(validOTP.otp_id);

    console.log(`✅ Password reset successful for ${email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! Please sign in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to reset password. Please try again later.'
    });
  }
};

// REFRESH TOKEN

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }

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

    const sessionSnapshot = await db.collection('sessions')
      .where('user_id', '==', decoded.uid)
      .where('refresh_token', '==', token)
      .limit(1)
      .get();

    if (sessionSnapshot.empty) {
      return res.status(401).json({
        success: false,
        message: 'Session not found. Please sign in again.'
      });
    }

    const user = await userModel.getUserById(decoded.uid);
    if (!user) {
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
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// LOGOUT

const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      const sessionSnapshot = await db.collection('sessions')
        .where('user_id', '==', req.user.uid)
        .where('refresh_token', '==', token)
        .limit(1)
        .get();

      if (!sessionSnapshot.empty) {
        await sessionSnapshot.docs[0].ref.delete();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout.'
    });
  }
};

// GET CURRENT USER

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
          uid: user.user_id,
          fullName: user.full_name,
          email: user.email,
          profilePicture: user.profile_picture || null,
          authProvider: user.auth_provider,
          hasPassword: !!user.password_hash
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// UPDATE PROFILE


const updateProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { fullName } = req.body;

    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters.'
      });
    }

    await db.collection('students').doc(userId).update({
      full_name: fullName.trim(),
      updated_at: new Date().toISOString()
    });

    const updatedUser = await userModel.getUserById(userId);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          uid: updatedUser.user_id,
          fullName: updatedUser.full_name,
          email: updatedUser.email,
          profilePicture: updatedUser.profile_picture || null,
          authProvider: updatedUser.auth_provider,
          hasPassword: !!updatedUser.password_hash
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile. Please try again.'
    });
  }
};

// CHANGE PASSWORD

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

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters.'
      });
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }

    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.auth_provider === 'google' && !user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'Set a password first from your Account settings before you can change it.'
      });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await userModel.updatePasswordHash(userId, newPasswordHash);

    try {
      await auth.updateUser(userId, { password: newPassword });
      console.log(`✅ Firebase Auth password changed for uid: ${userId}`);
    } catch (firebaseError) {
      console.error('Firebase Auth password update error:', firebaseError.message);
    }

    // Invalidate all sessions
    const sessionsSnapshot = await db.collection('sessions')
      .where('user_id', '==', userId)
      .get();

    const batch = db.batch();
    sessionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please sign in again.'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password. Please try again.'
    });
  }
};

// SET PASSWORD
// For a Google-only account (no password_hash yet) adding a password for
// the first time, so it can also sign in with email/password afterward.
// Requires a freshly-verified Google idToken (not the app's own JWT) as
// proof of identity, since there's no existing password to check instead.

const setPassword = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { idToken, newPassword } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your Google account to continue.'
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters.'
      });
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }

    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'You already have a password set. Use Change Password to update it.'
      });
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token. Please try again.'
      });
    }

    if (decodedToken.uid !== userId) {
      return res.status(401).json({
        success: false,
        message: 'Google verification does not match your signed-in account.'
      });
    }

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    await userModel.updatePasswordHash(userId, newPasswordHash);

    try {
      await auth.updateUser(userId, { password: newPassword });
      console.log(`✅ Firebase Auth password set for uid: ${userId}`);
    } catch (firebaseError) {
      console.error('Firebase Auth password set error:', firebaseError.message);
    }

    // Unlike changePassword, existing sessions stay valid — we're adding a
    // credential, not changing/compromising one, so no need to force a
    // re-login.
    res.status(200).json({
      success: true,
      message: 'Password set successfully! You can now also sign in with your email and password.'
    });

  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set password. Please try again.'
    });
  }
};

// MODULE EXPORTS

module.exports = {
  ping,
  signup,
  verifyOTP,
  resendOTP,
  signin,
  googleAuth,
  linkGoogleAccount,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  refreshToken,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword,
  setPassword,
};