// controllers/authController.js
// Fixed: User is only created AFTER OTP verification

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db, auth } = require('../config/firebase');

const userModel = require('../models/userModel');
const otpModel = require('../models/otpModel');
const { generateOTP, getOTPExpiry } = require('../utils/generateOTP');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateJWT');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

// ─────────────────────────────────────────────────────────────────────────────
// SIGN UP - STORES TEMPORARY DATA, NO USER CREATED YET
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────────────

const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // 1. Check if email is already registered
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

    // 2. Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3. Generate a temporary ID for pending user
    const tempUserId = uuidv4();

    // 4. Store temporary user data (NOT in main users collection)
    const pendingUserData = {
      fullName,
      email,
      passwordHash,
      tempUserId,
      createdAt: new Date().toISOString(),
      expiresAt: getOTPExpiry(10).toISOString() // Expires in 10 minutes
    };

    // Store in a temporary collection
    await db.collection('pending_users').doc(tempUserId).set(pendingUserData);

    // 5. Generate OTP and save it
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(5);

    // Store OTP with tempUserId
    await otpModel.invalidateAllOTPsByEmail(email, 'signup');
    await otpModel.createOTPWithEmail(email, otp, 'signup', otpExpiry, tempUserId);

    // 6. Send verification email
    await sendVerificationEmail(email, fullName, otp);

    res.status(201).json({
      success: true,
      message: 'Verification code sent! Please check your email to complete registration.',
      data: {
        email: email,
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

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY OTP - CREATES USER ONLY AFTER SUCCESSFUL VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // 1. Find pending user by email
    const pendingSnapshot = await db.collection('pending_users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (pendingSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found. Please sign up again.'
      });
    }

    const pendingDoc = pendingSnapshot.docs[0];
    const pendingUser = pendingDoc.data();

    // Check if pending user expired
    if (new Date(pendingUser.expiresAt) < new Date()) {
      await pendingDoc.ref.delete();
      return res.status(400).json({
        success: false,
        message: 'Registration session expired. Please sign up again.'
      });
    }

    // 2. Verify OTP
    const validOTP = await otpModel.getValidOTPByEmail(email, 'signup');

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

    // 3. Check if email was already registered during this time
    const existingUser = await userModel.getUserByEmail(email);
    if (existingUser) {
      await pendingDoc.ref.delete();
      await otpModel.markOTPUsed(validOTP.otp_id);
      return res.status(409).json({
        success: false,
        message: 'Email was already registered. Please sign in.'
      });
    }

    // 4. CREATE USER IN FIREBASE AUTH AND FIRESTORE (ONLY NOW!)
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email: email,
        password: pendingUser.passwordHash ? 'temporary' : undefined,
        displayName: pendingUser.fullName,
        emailVerified: true
      });
      
      // Update password after creation
      if (pendingUser.passwordHash) {
        await auth.updateUser(firebaseUser.uid, { password: pendingUser.passwordHash });
      }
    } catch (firebaseError) {
      console.error('Firebase Auth creation error:', firebaseError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create account. Please try again.'
      });
    }

    // 5. Create user document in Firestore
    await userModel.createUser(firebaseUser.uid, {
      fullName: pendingUser.fullName,
      email: email,
      passwordHash: pendingUser.passwordHash,
      isVerified: true,
      authProvider: 'email'
    });

    // 6. Mark OTP as used
    await otpModel.markOTPUsed(validOTP.otp_id);

    // 7. Delete pending user data
    await pendingDoc.ref.delete();

    res.status(200).json({
      success: true,
      message: 'Email verified and account created successfully! You can now sign in.'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification. Please try again.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESEND OTP
// ─────────────────────────────────────────────────────────────────────────────

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Check pending users
    const pendingSnapshot = await db.collection('pending_users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (pendingSnapshot.empty) {
      // Check if already verified
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser && existingUser.is_verified) {
        return res.status(400).json({
          success: false,
          message: 'This account is already verified. Please sign in.'
        });
      }
      return res.status(200).json({
        success: true,
        message: 'If this email exists in our system, a new OTP has been sent.'
      });
    }

    const pendingUser = pendingSnapshot.docs[0].data();

    // Invalidate old OTPs
    await otpModel.invalidateAllOTPsByEmail(email, 'signup');
    
    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(5);
    await otpModel.createOTPWithEmail(email, otp, 'signup', otpExpiry, pendingUser.tempUserId);
    
    // Send email
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

// ─────────────────────────────────────────────────────────────────────────────
// SIGN IN (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await userModel.getUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    
    if (user.auth_provider === 'google') {
      return res.status(400).json({ success: false, message: 'This account uses Google Sign-In.' });
    }
    
    if (!user.is_verified) {
      return res.status(403).json({ success: false, message: 'Please verify your email first.' });
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
          profilePicture: user.profile_picture,
          authProvider: user.auth_provider
        },
        tokens: {
          accessToken: accessToken,
          refreshToken: refreshToken
        }
      }
    });
    
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE AUTH (direct creation, no OTP needed)
// ─────────────────────────────────────────────────────────────────────────────

const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'No ID token provided'
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

    const { uid, email, name, picture } = decodedToken;

    const existingUserByEmail = await userModel.getUserByEmail(email);
    
    if (existingUserByEmail && existingUserByEmail.auth_provider !== 'google') {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered with email/password. Please sign in using your email and password instead.'
      });
    }

    let user = await userModel.getUserById(uid);

    if (!user) {
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
// FORGOT PASSWORD (unchanged)
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
        message: 'Please verify your email address first.',
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
// VERIFY RESET OTP (unchanged)
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
// RESET PASSWORD (unchanged from your current version)
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

    // Update password hash in Firestore
    await userModel.updatePasswordHash(user.user_id, newPasswordHash);
    
    let firebaseUser = null;
    let batch = db.batch();
    
    try {
      try {
        firebaseUser = await auth.getUser(user.user_id);
        console.log(`✅ Found user by UID: ${firebaseUser.uid}`);
      } catch (getUserError) {
        if (getUserError.code === 'auth/user-not-found') {
          console.log(`⚠️ User ${email} not found by UID ${user.user_id}, searching by email...`);
          try {
            firebaseUser = await auth.getUserByEmail(email);
            console.log(`✅ Found user by email with different UID: ${firebaseUser.uid}`);
          } catch (emailError) {
            console.log(`⚠️ User ${email} not found in Firebase Auth at all, will create new...`);
            firebaseUser = null;
          }
        } else {
          throw getUserError;
        }
      }
      
      if (firebaseUser) {
        if (firebaseUser.uid !== user.user_id) {
          console.log(`⚠️ UID mismatch: Firestore has ${user.user_id}, Firebase has ${firebaseUser.uid}`);
          console.log(`🔄 Syncing Firestore user to match Firebase Auth UID...`);
          
          await db.collection('students').doc(user.user_id).delete();
          
          await userModel.createUser(firebaseUser.uid, {
            fullName: user.full_name,
            email: user.email,
            passwordHash: newPasswordHash,
            isVerified: user.is_verified || true,
            authProvider: 'email'
          });
          
          await auth.updateUser(firebaseUser.uid, { password: newPassword });
          console.log(`✅ Synced and updated user with UID: ${firebaseUser.uid}`);
          
          const oldSessionsSnapshot = await db.collection('sessions')
            .where('user_id', '==', user.user_id)
            .get();
          
          oldSessionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        } else {
          await auth.updateUser(firebaseUser.uid, { password: newPassword });
          console.log(`✅ Firebase Auth password updated for ${email}`);
        }
      } else {
        console.log(`📝 Creating new Firebase Auth user for ${email}...`);
        await auth.createUser({
          uid: user.user_id,
          email: user.email,
          password: newPassword,
          displayName: user.full_name,
          emailVerified: user.is_verified || false
        });
        console.log(`✅ Firebase Auth user created for ${email}`);
      }
    } catch (firebaseError) {
      console.error('Firebase password update error:', firebaseError);
    }

    const sessionsSnapshot = await db.collection('sessions')
      .where('user_id', '==', user.user_id)
      .get();
    
    sessionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    if (firebaseUser && firebaseUser.uid !== user.user_id) {
      const newSessionsSnapshot = await db.collection('sessions')
        .where('user_id', '==', firebaseUser.uid)
        .get();
      
      newSessionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    }
    
    await batch.commit();
    await otpModel.markOTPUsed(validOTP.otp_id);

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
// REFRESH TOKEN (unchanged)
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
// LOGOUT (unchanged)
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
// GET CURRENT USER (unchanged)
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