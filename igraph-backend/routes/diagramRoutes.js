// igraph-backend/routes/diagramRoutes.js
// ✅ ADDED: PUT route for renaming diagrams

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  saveDiagram,
  getSavedDiagrams,
  getDiagram,
  renameDiagram,  // ✅ NEW
  deleteDiagram,
} = require('../controllers/diagramController');

// All routes require authentication
router.use(protect);

// Save a new diagram
router.post('/save', saveDiagram);

// Get all saved diagrams for the current user
router.get('/user', getSavedDiagrams);

// Get a specific diagram by ID
router.get('/:id', getDiagram);

// ✅ NEW: Rename a diagram
router.put('/:id', renameDiagram);

// Delete a diagram
router.delete('/:id', deleteDiagram);

module.exports = router;