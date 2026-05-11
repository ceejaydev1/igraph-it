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

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (user.auth_provider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In. Please sign in with Google.'
      });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before signing in.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
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
// GOOGLE AUTH (UPDATED WITH DEBUG LOGS)
// ─────────────────────────────────────────────────────────────────────────────

const googleAuth = async (req, res) => {
  try {
    console.log('🔍 STEP 1: Google auth request received');
    console.log('📦 STEP 2: Request body:', req.body);
    
    const { idToken } = req.body;
    
    console.log('🔑 STEP 3: idToken received:', idToken ? `YES (length: ${idToken.length})` : 'NO');

    if (!idToken) {
      console.log('❌ STEP 4: No idToken provided');
      return res.status(400).json({
        success: false,
        message: 'No ID token provided'
      });
    }

    // 1. Verify the Google ID token using Firebase Admin
    let decodedToken;
    try {
      console.log('🔄 STEP 5: Verifying token with Firebase Auth...');
      decodedToken = await auth.verifyIdToken(idToken);
      console.log('✅ STEP 6: Token verified successfully!');
      console.log('👤 STEP 7: User email:', decodedToken.email);
      console.log('🆔 STEP 8: User UID:', decodedToken.uid);
    } catch (err) {
      console.error('❌ STEP 9: Token verification failed:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token. Please try again.'
      });
    }

    const { uid, email, name, picture } = decodedToken;

    // 2. Check if user already exists in Firestore
    console.log('🔍 STEP 10: Checking if user exists in Firestore...');
    let user = await userModel.getUserById(uid);
    console.log('👤 STEP 11: User exists?', user ? 'YES' : 'NO');

    if (!user) {
      console.log('📝 STEP 12: Creating new user...');
      // Generate a unique username from their Google display name
      const baseUsername = name
        ? name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + uid.substring(0, 5)
        : 'user_' + uid.substring(0, 8);

      await userModel.createUser(uid, {
        fullName: name || 'Google User',
        username: baseUsername,
        email: email,
        passwordHash: null,
        isVerified: true,
        profilePicture: picture || null,
        authProvider: 'google'
      });

      user = await userModel.getUserById(uid);
      console.log('✅ STEP 13: New user created:', email);
    } else {
      console.log('✅ STEP 13: Existing user found:', email);
    }

    // 4. Generate JWT tokens
    console.log('🔑 STEP 14: Generating JWT tokens...');
    const accessToken = generateAccessToken(uid, email);
    const refreshToken = generateRefreshToken(uid);

    // 5. Store session
    console.log('💾 STEP 15: Storing session in Firestore...');
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

    console.log('✅ STEP 16: Session stored successfully!');
    console.log('🎉 STEP 17: Sending success response...');

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
    console.error('💥 GOOGLE AUTH ERROR:', error);
    console.error('💥 Error stack:', error.stack);
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

    const user = await userModel.getUserByEmail(email);

    if (user && user.is_verified && user.auth_provider === 'email') {
      await otpModel.invalidateAllOTPs(user.user_id, 'reset');
      const otp = generateOTP();
      const otpExpiry = getOTPExpiry(5);
      await otpModel.createOTP(user.user_id, otp, 'reset', otpExpiry);
      await sendPasswordResetEmail(email, user.full_name, otp);

      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({
          success: true,
          message: 'If this email is registered, a password reset OTP has been sent.',
          debug_otp: otp
        });
      }
    }

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

    res.status(200).json({
      success: true,
      message: 'OTP verified. You may now reset your password.',
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
// ─────────────────────────────────────────────────────────────────────────────

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

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
        message: 'Invalid or expired OTP. Please restart the password reset process.'
      });
    }

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await userModel.updatePasswordHash(user.user_id, newPasswordHash);
    await auth.updateUser(user.user_id, { password: newPassword });
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
      message: 'Server error during password reset. Please try again.'
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
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

const getCurrentUser = async (req, res) => {
  try {
    console.log('🔍 Getting current user:', req.user.uid);
    
    const user = await userModel.getUserById(req.user.uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
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
      message: 'Server error'
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