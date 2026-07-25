require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const authRoutes = require('./routes/authRoutes');
const diagramRoutes = require('./routes/diagramRoutes');

const app = express();

// Render sits in front of this app as a reverse proxy — without this,
// Express reads req.ip from the raw socket (Render's proxy) instead of the
// X-Forwarded-For header, so every request looks like it comes from the
// same IP and all the rate limiters below end up bucketing every visitor
// together. `1` trusts exactly one hop (Render's own proxy), which is the
// correct value for this setup — not `true`, which would trust an
// attacker-supplied X-Forwarded-For if this app were ever reachable directly.
app.set('trust proxy', 1);

const allowedOrigins = [

  'https://igraph-backend.onrender.com',
  'https://igraphit.vercel.app',
  
  'http://localhost:3001',
  'http://localhost:5000',
  'http://localhost:8080',
  'http://localhost:8081',
  
  'http://192.168.1.100:19000',
  'http://192.168.1.100:5000',
  'http://192.168.1.100:8081',
  'http://10.0.0.1:8081',
  'http://10.0.0.2:8081',
  
  'exp://localhost:19000',
  'exp://127.0.0.1:19000',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    console.log(`🔍 Checking origin: ${origin}`);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return allowed === origin;
    });
    
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.0\.0\.)/.test(origin);
    const isNetlify = /^https?:\/\/.*\.netlify\.app/.test(origin);
    
    if (isAllowed || isLocal || isNetlify) {
      console.log(`CORS allowed: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
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

app.use(cors(corsOptions));
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
    const isNetlify = /^https?:\/\/.*\.netlify\.app/.test(origin);
    
    if (isAllowed || isLocal || isNetlify) {
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(compression());

const isProduction = process.env.NODE_ENV === 'production';
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: isProduction ? undefined : false,
}));

// Error handler for payload too large
app.use((err, req, res, next) => {
  console.error('❌ Error caught by middleware:', err);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request too large. Maximum size is 50MB.',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }
  
  next(err);
});

const PORT = process.env.PORT || 5000;

// RATE LIMITING

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

// ROUTES

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
app.use('/api/diagrams', diagramRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
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
      message: 'Request too large. Please use a smaller payload.',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// START SERVER

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ iGraph IT Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 JSON limit: 50mb`);
  console.log(`🔒 CORS enabled for ${allowedOrigins.length} origins`);
  console.log(`📡 Local: http://localhost:${PORT}`);
});

module.exports = app;