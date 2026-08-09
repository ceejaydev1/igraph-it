require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const authRoutes = require('./routes/authRoutes');
const diagramRoutes = require('./routes/diagramRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const { verifyCsrfToken } = require('./middleware/csrfMiddleware');
const { attachCollabSocket } = require('./services/collabSocket');

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
    'X-CSRF-Token',
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
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token');
      res.header('Access-Control-Expose-Headers', 'Content-Length, X-Request-Id');
    }
  }
  
  if (req.method === 'OPTIONS') {
    console.log('📨 Handling OPTIONS preflight for:', req.path);
    return res.sendStatus(204);
  }
  next();
});

app.use(cookieParser());
// 50mb used to be needed because diagram saves could carry an oversized
// preview thumbnail (see maxDimension in app/(tabs)/create.tsx's
// renderDiagramToCanvas — thumbnails used to scale with the diagram's own
// size instead of being capped) plus every page's full XML on every save.
// With that image now capped to a couple hundred KB at most, 15mb is still
// a generous ceiling for even a large multi-page diagram's XML, without
// leaving a 512MB-RAM instance exposed to parsing near a 50mb body on every
// request.
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
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
      message: 'Request too large. Maximum size is 15MB.',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }
  
  next(err);
});

const PORT = process.env.PORT || 5000;

// RATE LIMITING

// 100/15min was tripping during completely normal single-user interactive
// use — navigating between screens, autosave on tab-switch/blur, opening
// Share/Print, the Saved Diagrams list ping — well before anything abusive
// was happening. This is a blanket IP-wide catch-all that sits underneath
// the tighter, more targeted per-route/per-account limiters added later
// (see routes/authRoutes.js, routes/diagramRoutes.js, routes/
// feedbackRoutes.js) — those are the real abuse guard for anything
// sensitive or expensive; this one only needs to catch an outright flood.
// Keyed by IP (express-rate-limit's default, no override here), which is
// exactly what makes it the one to watch in a shared-NAT setting — a school
// computer lab's whole class shares a single public IP, so this budget is
// really "everyone in that room combined," not "one person." 2000/15min
// (~133/min average) is sized for ~40-50 concurrently active users each
// browsing/loading/autosaving normally, not just one.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200000, // TEMP: raised for local stress-test run, reverting to 2000 after
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

// Double-submit CSRF check for the cookie-backed auth model — self-exempts
// GET/HEAD/OPTIONS and any request with no Origin header (native), so it's
// safe to apply globally rather than duplicating it per router.
app.use(verifyCsrfToken);

app.use('/api/auth', authRoutes);
app.use('/api/diagrams', diagramRoutes);
app.use('/api/feedback', feedbackRoutes);

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

const httpServer = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ iGraph IT Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 JSON limit: 15mb`);
  console.log(`🔒 CORS enabled for ${allowedOrigins.length} origins`);
  console.log(`📡 Local: http://localhost:${PORT}`);
});

// Real-time collaborative editing (see services/collabSocket.js) — attached
// to the same underlying HTTP server so it shares the one Render web
// service/port rather than needing its own. Reuses corsOptions.origin
// (same allowed-origins/localhost/Netlify check as the REST API above)
// instead of duplicating that logic.
attachCollabSocket(httpServer, corsOptions.origin);

module.exports = app;