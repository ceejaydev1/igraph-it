const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notesController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, notesController.createNote);
router.get('/', protect, notesController.getNotes);
router.delete('/:noteId', protect, notesController.deleteNote);

module.exports = router;