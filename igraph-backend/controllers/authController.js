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
      
      // User-friendly error messages
      if (firebaseError.code === 'auth/email-already-exists') {
        return res.status(409).json({
          success: false,
          message: 'This email is already registered. Please sign in.'
        });
      }
      if (firebaseError.code === 'auth/invalid-email') {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address.'
        });
      }
      if (firebaseError.code === 'auth/weak-password') {
        return res.status(400).json({
          success: false,
          message: 'Password is too weak. Please use at least 8 characters with uppercase, lowercase, numbers, and special characters.'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Unable to create account. Please try again later.'
      });
    }

    // 4. Hash the password for storage in Firestore
    const saltRounds = 12;
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
    const otpExpiry = getOTPExpiry(5);

    await otpModel.invalidateAllOTPs(firebaseUser.uid, 'signup');
    await otpModel.createOTP(firebaseUser.uid, otp, 'signup', otpExpiry);

    // 7. Send verification email
    try {
      await sendVerificationEmail(email, fullName, otp);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Still return success but inform user
      return res.status(201).json({
        success: true,
        message: 'Account created! However, we could not send the verification email. Please use "Resend OTP" or contact support.',
        data: {
          email: email,
          ...(process.env.NODE_ENV === 'development' && { debug_otp: otp })
        }
      });
    }

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
      message: 'Something went wrong. Please try again later.'
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
        message: 'No account found with this email address. Please sign up first.'
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Your email is already verified. Please sign in.'
      });
    }

    const validOTP = await otpModel.getValidOTP(user.user_id, 'signup');

    if (!validOTP) {
      return res.status(400).json({
        success: false,
        message: 'Your OTP has expired or is invalid. Please request a new OTP.'
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
      message: 'Unable to verify OTP. Please try again.'
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
    
    try {
      await sendVerificationEmail(email, user.full_name, otp);
    } catch (emailError) {
      console.error('Resend email error:', emailError);
      return res.status(200).json({
        success: true,
        message: `A new OTP has been generated. (Development OTP: ${otp})`,
        ...(process.env.NODE_ENV === 'development' && { debug_otp: otp })
      });
    }

    res.status(200).json({
      success: true,
      message: 'A new OTP has been sent to your email.',
      ...(process.env.NODE_ENV === 'development' && { debug_otp: otp })
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to resend OTP. Please try again later.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGN IN
// ─────────────────────────────────────────────────────────────────────────────

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please try again.'
      });
    }

    // Check auth provider
    if (user.auth_provider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'This email is linked to a Google account. Please sign in with Google.',
        code: 'GOOGLE_ACCOUNT'
      });
    }

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before signing in. Check your inbox for the verification code.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please try again.'
      });
    }

    // Generate tokens
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
      message: 'Welcome back!',
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
      message: 'Unable to sign in. Please check your connection and try again.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE AUTH (UPDATED - PREVENTS DUPLICATE EMAILS WITH USER-FRIENDLY ERRORS)
// ─────────────────────────────────────────────────────────────────────────────

const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Unable to sign in with Google. Please try again.'
      });
    }

    // Verify the Google ID token using Firebase Admin
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Google sign-in failed. Please make sure you are logged into your Google account and try again.'
      });
    }

    const { uid, email, name, picture } = decodedToken;

    // CHECK IF EMAIL IS ALREADY USED WITH EMAIL/PASSWORD (PREVENTS DUPLICATE)
    const existingUserByEmail = await userModel.getUserByEmail(email);
    
    if (existingUserByEmail && existingUserByEmail.auth_provider !== 'google') {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered with a password. Please sign in using your email and password instead.',
        code: 'EMAIL_WITH_PASSWORD'
      });
    }

    // Check if user already exists in Firestore by UID
    let user = await userModel.getUserById(uid);

    if (!user) {
      // Generate a unique username from their Google display name
      let baseUsername = name
        ? name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + uid.substring(0, 5)
        : 'user_' + uid.substring(0, 8);
      
      // Ensure username is unique
      let usernameExists = await userModel.isUsernameExists(baseUsername);
      let finalUsername = baseUsername;
      let counter = 1;
      while (usernameExists) {
        finalUsername = `${baseUsername}${counter}`;
        usernameExists = await userModel.isUsernameExists(finalUsername);
        counter++;
      }

      await userModel.createUser(uid, {
        fullName: name || 'Google User',
        username: finalUsername,
        email: email,
        passwordHash: null,
        isVerified: true,
        profilePicture: picture || null,
        authProvider: 'google'
      });

      user = await userModel.getUserById(uid);
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(uid, email);
    const refreshToken = generateRefreshToken(uid);

    // Store session
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
      message: 'Welcome! You have successfully signed in with Google.',
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
      message: 'Unable to sign in with Google. Please try again later.'
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

    if (user && user.is_verified && user.auth_provider === 'email') {
      await otpModel.invalidateAllOTPs(user.user_id, 'reset');
      const otp = generateOTP();
      const otpExpiry = getOTPExpiry(5);
      await otpModel.createOTP(user.user_id, otp, 'reset', otpExpiry);
      
      try {
        await sendPasswordResetEmail(email, user.full_name, otp);
      } catch (emailError) {
        console.error('Password reset email error:', emailError);
        // Still return success but with OTP in response for development
        if (process.env.NODE_ENV === 'development') {
          return res.status(200).json({
            success: true,
            message: 'A password reset code has been generated.',
            debug_otp: otp
          });
        }
      }

      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({
          success: true,
          message: 'A password reset code has been sent to your email.',
          debug_otp: otp
        });
      }
    }

    // Always return success even if email doesn't exist (security best practice)
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
        message: 'No account found with this email address.'
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

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in Firestore
    await userModel.updatePasswordHash(user.user_id, newPasswordHash);
    
    // Update password in Firebase Authentication
    try {
      await auth.updateUser(user.user_id, { password: newPassword });
    } catch (firebaseError) {
      console.error('Firebase password update error:', firebaseError);
      // Continue even if Firebase update fails - Firestore is our source of truth
    }
    
    // Mark OTP as used
    await otpModel.markOTPUsed(validOTP.otp_id);

    // Invalidate all existing sessions
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
        message: 'Session expired. Please sign in again.'
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please sign in again.'
      });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. Please sign in again.'
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
        message: 'User account not found.'
      });
    }

    const newAccessToken = generateAccessToken(user.user_id, user.email);

    res.status(200).json({
      success: true,
      message: 'Session refreshed.',
      data: {
        accessToken: newAccessToken
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to refresh session. Please sign in again.'
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
      message: 'You have been signed out successfully.'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to sign out. Please try again.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET CURRENT USER (protected route)
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

const getCurrentUser = async (req, res) => {
  try {
    const user = await userModel.getUserById(req.user.uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          uid: user.user_id,
          fullName: user.full_name,
          username: user.username,
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
      message: 'Unable to load user profile. Please refresh the page.'
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
  logout,
  getCurrentUser,
};