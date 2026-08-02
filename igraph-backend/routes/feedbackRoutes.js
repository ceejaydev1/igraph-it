const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { protect } = require('../middleware/authMiddleware');
const { submitFeedback } = require('../controllers/feedbackController');

router.use(protect);

// Feedback is a rare, deliberate action — nobody legitimately submits it
// repeatedly in a short window. Keyed by account (protect above guarantees
// req.user), falling back to IP only in the defensive case it's missing.
const feedbackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const uid = req.user?.uid;
    return uid ? `feedback:acct:${uid}` : `feedback:ip:${ipKeyGenerator(req)}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many feedback submissions. Please try again later.' },
});

router.post('/', feedbackLimiter, submitFeedback);

module.exports = router;
