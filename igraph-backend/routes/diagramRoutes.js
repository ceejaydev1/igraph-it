const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
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

// Keyed by account (req.user.uid, set by protect above — every route here
// requires login) rather than IP, same reasoning as authRoutes.js's account
// limiters: an office/NAT'd network sharing one IP shouldn't share one quota.
// Falls back to IP only in the defensive case protect somehow didn't run.
const userKey = (prefix) => (req) => {
  const uid = req.user?.uid;
  return uid ? `${prefix}:acct:${uid}` : `${prefix}:ip:${ipKeyGenerator(req)}`;
};

// Baseline for everything under /api/diagrams — reads, renames, share
// management. Loose enough that a busy Share modal or fast page-switching
// session never comes close.
const diagramLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: userKey('diagram'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down and try again shortly.' },
});
router.use(diagramLimiter);

// /save carries the full diagram XML plus a preview image on every call, so
// it gets its own tighter cap stacked on top of the baseline above — real
// usage is a manual Save click or the occasional background sync on
// tab-blur/visibility-change (see attemptBackgroundSync in app/(tabs)/
// create.tsx), never anywhere near this in normal editing.
const saveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: userKey('diagram-save'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many save requests. Please slow down and try again shortly.' },
});

router.post('/save', saveLimiter, saveDiagram);

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