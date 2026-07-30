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
const {
  getShareSettings,
  addCollaborator,
  updateCollaboratorPermission,
  removeCollaborator,
  updateShareLink,
  redeemShareLink,
  requestAccess,
  approveAccessRequest,
  denyAccessRequest,
} = require('../controllers/shareController');

router.use(protect);

router.post('/save', saveDiagram);

router.get('/user', getSavedDiagrams);

// Keyed by token rather than diagram id, so this has to be registered ahead
// of the generic '/:id' routes below to avoid Express matching "share-links"
// itself as an :id.
router.post('/share-links/:token/redeem', redeemShareLink);

router.get('/:id', getDiagram);

router.put('/:id', renameDiagram);

router.delete('/:id', deleteDiagram);

router.get('/:id/share', getShareSettings);
router.post('/:id/share/collaborators', addCollaborator);
router.patch('/:id/share/collaborators/:userId', updateCollaboratorPermission);
router.delete('/:id/share/collaborators/:userId', removeCollaborator);
router.patch('/:id/share/link', updateShareLink);

router.post('/:id/access-requests', requestAccess);
router.post('/:id/access-requests/:userId/approve', approveAccessRequest);
router.post('/:id/access-requests/:userId/deny', denyAccessRequest);

module.exports = router;