const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const COLLECTION = 'diagram_feedback';
const MAX_MESSAGE_LENGTH = 2000;

const submitFeedback = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { diagramId, diagramTitle, diagramType, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please write something about what you learned.',
      });
    }

    if (message.trim().length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Feedback must be under ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    if (diagramId === undefined || diagramId === null) {
      return res.status(400).json({
        success: false,
        message: 'Missing diagram reference.',
      });
    }

    const now = new Date().toISOString();
    const feedbackId = uuidv4();

    const feedbackData = {
      feedback_id: feedbackId,
      user_id: userId,
      user_email: req.user.email || null,
      diagram_id: diagramId,
      diagram_title: diagramTitle || null,
      diagram_type: diagramType || null,
      message: message.trim(),
      created_at: now,
    };

    console.log(`📝 Feedback submitted by user ${userId} for diagram ${diagramId} (${diagramTitle || 'unknown'})`);

    await db.collection(COLLECTION).doc(feedbackId).set(feedbackData);

    console.log(`✅ Feedback ${feedbackId} saved`);

    res.status(201).json({
      success: true,
      message: 'Your feedback has been submitted successfully.',
      data: { id: feedbackId },
    });
  } catch (error) {
    console.error('❌ Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  submitFeedback,
};
