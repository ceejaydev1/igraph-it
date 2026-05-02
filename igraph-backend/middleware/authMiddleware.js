const { verifyAccessToken } = require('../utils/generateJWT');
const { getUserById } = require('../models/userModel');

const protect = async (req, res, next) => {
  try {
    //Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1]; 

    // 2. Verify the token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please refresh your token.',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    // 3. Check that the token type is 'access' (not a refresh token)
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type.'
      });
    }

    // 4. Fetch user from Firestore to confirm they still exist
    const user = await getUserById(decoded.uid);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.'
      });
    }

    // 5. Attach user info to request object for use in controllers
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      fullName: user.full_name
    };

    next(); // Proceed to the protected route handler

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error.'
    });
  }
};

module.exports = { protect };