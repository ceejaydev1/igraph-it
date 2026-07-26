const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { submitFeedback } = require('../controllers/feedbackController');

router.use(protect);

router.post('/', submitFeedback);

module.exports = router;
