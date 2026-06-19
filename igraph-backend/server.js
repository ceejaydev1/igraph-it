require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const multer = require('multer');

const authRoutes = require('./routes/authRoutes');

const app = express();

// ============================================================================
// ✅ PRODUCTION-GRADE CORS CONFIGURATION
// ============================================================================

// ALLOWED ORIGINS - Add ALL your domains here
const allowedOrigins = [
  // Production
  'https://igraph-frontend.vercel.app',
  'https://igraph-it.vercel.app',
  'https://igraph-it.netlify.app',
  'https://igraph-backend.onrender.com',
  
  // Local Development - ALL ports
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://localhost:8080',
  'http://localhost:8081',  // ✅ YOUR PORT
  'http://localhost:8082',
  'http://localhost:19000',
  'http://localhost:19001',
  'http://localhost:19006',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',  // ✅ YOUR PORT
  'http://127.0.0.1:19000',
  'http://127.0.0.1:19006',
  
  // Network IPs
  'http://192.168.1.100:19000',
  'http://192.168.1.100:5000',
  'http://192.168.1.100:8081',
  'http://10.0.0.1:8081',
  'http://10.0.0.2:8081',
  
  // Expo
  'exp://localhost:19000',
  'exp://127.0.0.1:19000',
];

// ✅ CORS with dynamic origin checking
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    console.log(`🔍 Checking origin: ${origin}`);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return allowed === origin;
    });
    
    // Allow any localhost for development
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.0\.0\.)/.test(origin);
    
    if (isAllowed || isLocal) {
      console.log(`✅ CORS allowed: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
  ],
  exposedHeaders: ['Content-Length', 'X-Request-Id', 'Content-Type'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// ✅ Apply CORS FIRST
app.use(cors(corsOptions));

// ✅ Additional CORS middleware for preflight
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin) {
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return allowed === origin;
    });
    
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.0\.0\.)/.test(origin);
    
    if (isAllowed || isLocal) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      res.header('Access-Control-Expose-Headers', 'Content-Length, X-Request-Id');
    }
  }
  
  if (req.method === 'OPTIONS') {
    console.log('📨 Handling OPTIONS preflight for:', req.path);
    return res.sendStatus(204);
  }
  next();
});

// ============================================================================
// ✅ MULTER CONFIGURATION - For file uploads
// ============================================================================

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPEG, GIF, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter,
});

app.set('upload', upload);

// ============================================================================
// ✅ BODY PARSER - With increased limits
// ============================================================================

// ✅ Increase JSON limit to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Custom middleware to skip JSON parsing for FormData
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  if (contentType.includes('multipart/form-data')) {
    console.log('📦 Skipping JSON parse - multipart/form-data detected');
    // Don't parse JSON, let multer handle it
    return next();
  }
  next();
});

// Compression
app.use(compression());

// Security headers
const isProduction = process.env.NODE_ENV === 'production';
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: isProduction ? undefined : false,
}));

// ✅ Error handler for payload too large
app.use((err, req, res, next) => {
  console.error('❌ Error caught by middleware:', err);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request too large. Maximum size is 50MB.',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'Image too large. Maximum size is 5MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'UPLOAD_ERROR'
    });
  }
  
  next(err);
});

const PORT = process.env.PORT || 5000;

// ============================================================================
// RATE LIMITING
// ============================================================================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);

// ============================================================================
// ROUTES
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'iGraph IT Backend is running',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: Origin not allowed'
    });
  }
  
  if (err.type === 'entity.too.large' || err.message?.includes('too large')) {
    return res.status(413).json({
      success: false,
      message: 'Request too large. Please use a smaller image (under 5MB).',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ iGraph IT Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 JSON limit: 50mb`);
  console.log(`📦 File upload limit: 5mb`);
  console.log(`🔒 CORS enabled for ${allowedOrigins.length} origins`);
  console.log(`📡 Local: http://localhost:${PORT}`);
});

module.exports = app;