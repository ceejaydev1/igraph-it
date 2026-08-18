const NoteModel = require('../models/noteModel');

exports.createNote = async (req, res) => {
  try {
    const userId = req.user.uid; // set by authMiddleware
    const { text, diagramId, diagramTitle, diagramType } = req.body;

    if (!text || !diagramId || !diagramTitle || !diagramType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const note = await NoteModel.createNote(userId, {
      text,
      diagramId,
      diagramTitle,
      diagramType,
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ success: false, message: 'Failed to save note' });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const userId = req.user.uid;
    const notes = await NoteModel.getNotesByUser(userId);
    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notes' });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { noteId } = req.params;
    await NoteModel.deleteNote(noteId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    const status = error.message === 'Note not found' ? 404 : error.message === 'Unauthorized' ? 403 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};