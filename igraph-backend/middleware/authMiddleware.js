const { verifyAccessToken } = require('../utils/generateJWT');
const { getUserById } = require('../models/userModel');

const protect = async (req, res, next) => {
  try {
    // Extract token from the Authorization header (native) or, failing that,
    // the access_token cookie (web — httpOnly, so this is the only way the
    // server ever sees it; the browser attaches it automatically).
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

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

    next(); 

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error.'
    });
  }
};

module.exports = { protect };
