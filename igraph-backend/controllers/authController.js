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

// controllers/authController.js - Updated signup function

const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body; // Removed username

    // 1. Check if email is already registered
    const existingUser = await userModel.getUserByEmail(email);
    if (existingUser) {
      // ✅ FIX: Return DIFFERENT messages based on auth provider
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

    // 2. Create user in Firebase Authentication
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

    // 3. Hash the password for storage in Firestore
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Create user document in Firestore (without username)
    await userModel.createUser(firebaseUser.uid, {
      fullName,
      email,
      passwordHash,
      isVerified: false,
      authProvider: 'email'
    });

    // 5. Generate OTP and save it
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(5);

    await otpModel.invalidateAllOTPs(firebaseUser.uid, 'signup');
    await otpModel.createOTP(firebaseUser.uid, otp, 'signup', otpExpiry);

    // 6. Send verification email
    await sendVerificationEmail(email, fullName, otp);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please check your email for the OTP verification code.',
      data: {
        email: email,
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
// VERIFY OTP
// ─────────────────────────────────────────────────────────────────────────────

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.'
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified. Please sign in.'
      });
    }

    const validOTP = await otpModel.getValidOTP(user.user_id, 'signup');

    if (!validOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or is invalid. Please request a new OTP.'
      });
    }

    if (validOTP.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP code. Please check your email and try again.'
      });
    }

    await otpModel.markOTPUsed(validOTP.otp_id);
    await userModel.markUserVerified(user.user_id);
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
// ─────────────────────────────────────────────────────────────────────────────

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If this email exists in our system, a new OTP has been sent.'
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'This account is already verified. Please sign in.'
      });
    }

    await otpModel.invalidateAllOTPs(user.user_id, 'signup');
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(5);
    await otpModel.createOTP(user.user_id, otp, 'signup', otpExpiry);
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
// ─────────────────────────────────────────────────────────────────────────────

// BEFORE: Multiple database calls


// AFTER: Use Promise.all for parallel execution
const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // ✅ Single database call with projection (only needed fields)
    const user = await userModel.getUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    
    // ✅ Check auth provider first (fastest check)
    if (user.auth_provider === 'google') {
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In.' });
    }
    
    if (!user.is_verified) {
      return res.status(403).json({ success: false, message: 'Please verify your email first.' });
    }
    
    // ✅ bcrypt compare is the slowest operation - keep async
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    
    // ✅ Generate tokens (fast)
    const accessToken = generateAccessToken(user.user_id, user.email);
    const refreshToken = generateRefreshToken(user.user_id);
    
    // ✅ Create session (firestore write - async but fast)
    const sessionId = uuidv4();
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 7);
    
    // Don't await - fire and forget for faster response
    db.collection('sessions').doc(sessionId).set({
      session_id: sessionId,
      user_id: user.user_id,
      refresh_token: refreshToken,
      device_info: req.headers['user-agent'] || 'unknown',
      created_at: new Date().toISOString(),
      expires_at: sessionExpiry.toISOString()
    }).catch(err => console.error('Session save error:', err));
    
    // ✅ Send response immediately (don't wait for session save)
    res.status(200).json({
      success: true,
      message: 'Sign in successful!',
      data: {
        user: {
          uid: user.user_id,
          fullName: user.full_name,
          email: user.email,
          profilePicture: user.profile_picture,
          authProvider: user.auth_provider
        },
        tokens: { accessToken, refreshToken }
      }
    });
    
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE AUTH
// ─────────────────────────────────────────────────────────────────────────────

// controllers/authController.js - Updated googleAuth function

const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'No ID token provided'
      });
    }

    // 1. Verify the Google ID token using Firebase Admin
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

    // CHECK IF EMAIL IS ALREADY USED WITH EMAIL/PASSWORD
    const existingUserByEmail = await userModel.getUserByEmail(email);
    
    if (existingUserByEmail && existingUserByEmail.auth_provider !== 'google') {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered with email/password. Please sign in using your email and password instead.'
      });
    }

    // Check if user already exists in Firestore by UID
    let user = await userModel.getUserById(uid);

    if (!user) {
      // REMOVED username logic - no longer needed
      // Create user without username
      await userModel.createUser(uid, {
        fullName: name || 'Google User',
        email: email,
        passwordHash: null,
        isVerified: true,
        profilePicture: picture || null,
        authProvider: 'google'
      });

      user = await userModel.getUserById(uid);
    }

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
// ─────────────────────────────────────────────────────────────────────────────

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
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset code.'
      });
    }

    // CHECK IF USER USES GOOGLE AUTH
    if (user.auth_provider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'This email is linked to a Google account. Please sign in with Google instead.',
        code: 'GOOGLE_ACCOUNT'
      });
    }

    if (!user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email address first. Check your inbox for the verification code.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    await otpModel.invalidateAllOTPs(user.user_id, 'reset');
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(5);
    await otpModel.createOTP(user.user_id, otp, 'reset', otpExpiry);
    
    try {
      await sendPasswordResetEmail(email, user.full_name, otp);
    } catch (emailError) {
      console.error('Password reset email error:', emailError);
    }

    if (process.env.NODE_ENV === 'development') {
      return res.status(200).json({
        success: true,
        message: 'A password reset code has been sent to your email.',
        debug_otp: otp
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset code.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to process your request. Please try again later.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY RESET OTP
// ─────────────────────────────────────────────────────────────────────────────

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
      return res.status(400).json({
        success: false,
        message: 'No account found with this email address.'
      });
    }

    const validOTP = await otpModel.getValidOTP(user.user_id, 'reset');
    if (!validOTP || validOTP.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP code. Please request a new one.'
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
      message: 'Unable to verify OTP. Please try again.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

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
      return res.status(400).json({
        success: false,
        message: 'Invalid request. User not found.'
      });
    }

    if (user.auth_provider !== 'email') {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In. Password reset is not available.'
      });
    }

    const validOTP = await otpModel.getValidOTP(user.user_id, 'reset');
    if (!validOTP || validOTP.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please restart the password reset process.'
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
    } catch (firebaseError) {
      console.error('Firebase password update error:', firebaseError);
    }
    
    await otpModel.markOTPUsed(validOTP.otp_id);

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
      message: 'Unable to reset password. Please try again later.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH TOKEN
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
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// GET CURRENT USER (protected route)
// ─────────────────────────────────────────────────────────────────────────────

const getCurrentUser = async (req, res) => {
  try {
    const user = await userModel.getUserById(req.user.uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

// In authController.js - getCurrentUser
    res.status(200).json({
      success: true,
      data: {
        user: {
          uid: user.user_id,
          fullName: user.full_name,
          email: user.email,
          profilePicture: user.profile_picture || null,
          authProvider: user.auth_provider
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

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
  logout,
  getCurrentUser,
};