// igraph-backend/routes/diagramRoutes.js
// ✅ FULLY FIXED: All routes properly registered

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  saveDiagram,
  getSavedDiagrams,
  getDiagram,
  renameDiagram,
  deleteDiagram,
} = require('../controllers/diagramController');

// ✅ All routes require authentication
router.use(protect);

// Save a new diagram
router.post('/save', saveDiagram);

// Get all saved diagrams for the current user
router.get('/user', getSavedDiagrams);

// Get a specific diagram by ID
router.get('/:id', getDiagram);

// ✅ Rename a diagram - PUT request
router.put('/:id', renameDiagram);

// Delete a diagram
router.delete('/:id', deleteDiagram);

module.exports = router;