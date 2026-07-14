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

router.use(protect);

router.post('/save', saveDiagram);

router.get('/user', getSavedDiagrams);

router.get('/:id', getDiagram);

router.put('/:id', renameDiagram);

router.delete('/:id', deleteDiagram);

module.exports = router;