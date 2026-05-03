// controllers/authController.js
// Handles all authentication business logic

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db, auth } = require('../config/firebase');

const userModel = require('../models/userModel');
const otpModel = require('../models/otpModel');
const { generateOTP, getOTPExpiry } = require('../utils/generateOTP');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateJWT');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

// ─────────────────────────────────────────────────────────────────────────────
// SIGN UP
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────────────

const signup = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    // 1. Check if email is already registered
    const existingUser = await userModel.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered. Please sign in or use a different email.'
      });
    }

    // 2. Check if username is taken
    const usernameTaken = await userModel.isUsernameExists(username);
    if (usernameTaken) {
      return res.status(409).json({
        success: false,
        message: 'Username is already taken. Please choose a different username.'
      });
    }

    // 3. Create user in Firebase Authentication
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email: email,
        password: password,
        displayName: fullName,
        emailVerified: false
      });
    } catch (firebaseError) {
      console.error('Firebase Auth creation error:', firebaseError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create account. Please try again.'
      });
    }

    // 4. Hash the password for storage in Firestore (extra security layer)
    const saltRounds = 12; // Higher = more secure but slower; 12 is a good balance
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 5. Create student document in Firestore
    await userModel.createUser(firebaseUser.uid, {
      fullName,
      username,
      email,
      passwordHash,
      isVerified: false,
      authProvider: 'email'
    });

    // 6. Generate OTP and save it
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(5); // Expires in 5 minutes

    // Invalidate any old OTPs first, then create new one
    await otpModel.invalidateAllOTPs(firebaseUser.uid, 'signup');
    await otpModel.createOTP(firebaseUser.uid, otp, 'signup', otpExpiry);

    // 7. Send verification email
    await sendVerificationEmail(email, fullName, otp);

    // 8. Return success (do NOT return the OTP in production!)
    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please check your email for the OTP verification code.',
      data: {
        email: email,
        // Only show OTP in development to help with testing
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

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY OTP (email verification after signup)
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────────────────────────────────────

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // 1. Find the user by email
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.'
      });
    }

    // 2. Check if already verified
    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified. Please sign in.'
      });
    }

    // 3. Get the valid OTP for this user
    const validOTP = await otpModel.getValidOTP(user.user_id, 'signup');

    if (!validOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or is invalid. Please request a new OTP.'
      });
    }

    // 4. Compare the submitted OTP with the stored one
    if (validOTP.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP code. Please check your email and try again.'
      });
    }

    // 5. Mark OTP as used
    await otpModel.markOTPUsed(validOTP.otp_id);

    // 6. Mark user as verified in Firestore
    await userModel.markUserVerified(user.user_id);

    // 7. Update Firebase Auth email verification status
    await auth.updateUser(user.user_id, { emailVerified: true });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now sign in.'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification. Please try again.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESEND OTP
// POST /api/auth/resend-otp
// ─────────────────────────────────────────────────────────────────────────────

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Find user
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      // Security: don't reveal if email exists or not
      return res.status(200).json({
        success: true,
        message: 'If this email exists in our system, a new OTP has been sent.'
      });
    }

    // 2. Already verified — no need to resend
    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'This account is already verified. Please sign in.'
      });
    }

    // 3. Invalidate old OTPs and generate a new one
    await otpModel.invalidateAllOTPs(user.user_id, 'signup');
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(5);
    await otpModel.createOTP(user.user_id, otp, 'signup', otpExpiry);

    // 4. Send new OTP
    await sendVerificationEmail(email, user.full_name, otp);

    res.status(200).json({
      success: true,
      message: 'A new OTP has been sent to your email.',
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

// ─────────────────────────────────────────────────────────────────────────────
// SIGN IN
// POST /api/auth/signin
// ─────────────────────────────────────────────────────────────────────────────

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      // Security: use generic message to avoid revealing whether email exists
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 2. Block Google-only accounts from using email/password signin
    if (user.auth_provider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In. Please sign in with Google.'
      });
    }

    // 3. Check if email is verified
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before signing in.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // 4. Compare submitted password with stored hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 5. Generate tokens
    const accessToken = generateAccessToken(user.user_id, user.email);
    const refreshToken = generateRefreshToken(user.user_id);

    // 6. Store session in Firestore
    const sessionId = uuidv4();
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 7); // 7 days

    await db.collection('sessions').doc(sessionId).set({
      session_id: sessionId,
      user_id: user.user_id,
      refresh_token: refreshToken,
      device_info: req.headers['user-agent'] || 'unknown',
      created_at: new Date().toISOString(),
      expires_at: sessionExpiry.toISOString()
    });

    // 7. Return user data + tokens (never return password_hash)
    res.status(200).json({
      success: true,
      message: 'Sign in successful!',
      data: {
        user: {
          uid: user.user_id,
          fullName: user.full_name,
          username: user.username,
          email: user.email,
          profilePicture: user.profile_picture,
          authProvider: user.auth_provider
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during sign in. Please try again.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE AUTH
// POST /api/auth/google
// ─────────────────────────────────────────────────────────────────────────────

const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    // 1. Verify the Google ID token using Firebase Admin
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token. Please try again.'
      });
    }

    const { uid, email, name, picture } = decodedToken;

    // 2. Check if user already exists in Firestore
    let user = await userModel.getUserById(uid);

    if (!user) {
      // 3. New user — create their account automatically
      // Generate a unique username from their Google display name
      const baseUsername = name
        ? name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + uid.substring(0, 5)
        : 'user_' + uid.substring(0, 8);

      await userModel.createUser(uid, {
        fullName: name || 'Google User',
        username: baseUsername,
        email: email,
        passwordHash: null,       // Google users don't have a password
        isVerified: true,         // Google emails are pre-verified
        profilePicture: picture || null,
        authProvider: 'google'
      });

      user = await userModel.getUserById(uid);
    }

    // 4. Generate JWT tokens
    const accessToken = generateAccessToken(uid, email);
    const refreshToken = generateRefreshToken(uid);

    // 5. Store session
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
          username: user.username,
          email: user.email,
          profilePicture: user.profile_picture,
          authProvider: user.auth_provider
        },
        tokens: {
          accessToken,
          refreshToken
        }
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

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user (don't reveal if email exists or not for security)
    const user = await userModel.getUserByEmail(email);

    if (user && user.is_verified && user.auth_provider === 'email') {
      // Invalidate previous reset OTPs, generate new one
      await otpModel.invalidateAllOTPs(user.user_id, 'reset');
      const otp = generateOTP();
      const otpExpiry = getOTPExpiry(5);
      await otpModel.createOTP(user.user_id, otp, 'reset', otpExpiry);

      // Send reset email
      await sendPasswordResetEmail(email, user.full_name, otp);

      // Return OTP in dev mode only
      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({
          success: true,
          message: 'If this email is registered, a password reset OTP has been sent.',
          debug_otp: otp
        });
      }
    }

    // Always return same message (security: don't reveal if account exists)
    res.status(200).json({
      success: true,
      message: 'If this email is registered, a password reset OTP has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY RESET OTP
// POST /api/auth/verify-reset-otp
// ─────────────────────────────────────────────────────────────────────────────

const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request.'
      });
    }

    const validOTP = await otpModel.getValidOTP(user.user_id, 'reset');
    if (!validOTP || validOTP.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP code.'
      });
    }

    // We don't mark it as used here yet — it gets used when the password is reset
    // Instead, we issue a short-lived "reset verified" confirmation
    res.status(200).json({
      success: true,
      message: 'OTP verified. You may now reset your password.',
      // Return email so frontend can include it in the reset-password request
      data: { email }
    });

  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // 1. Find user
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request.'
      });
    }

    // 2. Re-verify OTP one final time (security: prevents race conditions)
    const validOTP = await otpModel.getValidOTP(user.user_id, 'reset');
    if (!validOTP || validOTP.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please restart the password reset process.'
      });
    }

    // 3. Hash the new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 4. Update password in Firestore
    await userModel.updatePasswordHash(user.user_id, newPasswordHash);

    // 5. Update password in Firebase Auth as well
    await auth.updateUser(user.user_id, { password: newPassword });

    // 6. Mark the OTP as used
    await otpModel.markOTPUsed(validOTP.otp_id);

    // 7. Invalidate ALL active sessions for this user (force re-login)
    const sessionsSnapshot = await db.collection('sessions')
      .where('user_id', '==', user.user_id)
      .get();

    const batch = db.batch();
    sessionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! Please sign in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset. Please try again.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH TOKEN
// POST /api/auth/refresh-token
// ─────────────────────────────────────────────────────────────────────────────

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }

    // 1. Verify the refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please sign in again.'
      });
    }

    // 2. Check if token type is correct
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type.'
      });
    }

    // 3. Verify this refresh token exists in the sessions collection
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

    // 4. Get current user info
    const user = await userModel.getUserById(decoded.uid);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.'
      });
    }

    // 5. Generate a new access token
    const newAccessToken = generateAccessToken(user.user_id, user.email);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        accessToken: newAccessToken
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// POST /api/auth/logout  (protected route)
// ─────────────────────────────────────────────────────────────────────────────

const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      // Delete the specific session associated with this refresh token
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

module.exports = {
  signup,
  verifyOTP,
  resendOTP,
  signin,
  googleAuth,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  refreshToken,
  logout
};
