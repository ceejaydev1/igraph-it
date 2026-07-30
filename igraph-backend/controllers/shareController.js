const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const { getUserByEmail, getUserById } = require('../models/userModel');
const {
  getAccessLevel,
  canView,
  canManageShareLink,
  canManageCollaborators,
  isValidCollaboratorPermission,
  isValidShareLinkPermission,
} = require('../utils/diagramAccess');
const { notifyPermissionChange } = require('../services/collabSocket');

const COLLECTION = 'diagrams';

const loadDiagramOr404 = async (res, diagramId) => {
  const doc = await db.collection(COLLECTION).doc(diagramId).get();
  if (!doc.exists) {
    res.status(404).json({ success: false, message: 'Diagram not found.' });
    return null;
  }
  return doc;
};

// Collaborator rows only ever carry what the Share dialog needs to render —
// looking the owner up the same way keeps "who is this person" consistent
// between the owner row and every collaborator row.
const publicUser = (userId, data, permission) => ({
  userId,
  fullName: data?.full_name || 'Unknown user',
  email: data?.email || '',
  permission,
});

const getShareSettings = async (req, res) => {
  try {
    const userId = req.user.uid;
    const diagramId = req.params.id;

    const doc = await loadDiagramOr404(res, diagramId);
    if (!doc) return;
    const data = doc.data();

    const accessLevel = getAccessLevel(data, userId);
    if (!canView(accessLevel)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this diagram.' });
    }

    const ownerData = await getUserById(data.user_id);
    const collaborators = data.collaborators || [];
    const collaboratorUsers = await Promise.all(
      collaborators.map(async (c) => {
        const u = await getUserById(c.user_id);
        return publicUser(c.user_id, u, c.permission);
      })
    );

    const shareLink = data.share_link || { enabled: false, token: null, permission: 'edit' };

    // Only the owner ever sees who's asking for access — nobody else has any
    // action to take on it, and it's nobody else's business who requested.
    const accessRequests =
      accessLevel === 'owner'
        ? (data.access_requests || []).map((r) => ({
            userId: r.user_id,
            fullName: r.full_name,
            email: r.email,
            message: r.message || '',
            requestedAt: r.requested_at,
          }))
        : [];

    res.status(200).json({
      success: true,
      data: {
        diagramName: data.name,
        myAccessLevel: accessLevel,
        owner: publicUser(data.user_id, ownerData, 'owner'),
        collaborators: collaboratorUsers,
        shareLink: {
          enabled: !!shareLink.enabled,
          permission: shareLink.permission || 'edit',
          // Token only goes out when the link is actually turned on — no
          // point handing out a dormant token that can't be used yet.
          token: shareLink.enabled ? shareLink.token : null,
        },
        accessRequests,
      },
    });
  } catch (error) {
    console.error('❌ Get share settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to load share settings.' });
  }
};

const addCollaborator = async (req, res) => {
  try {
    const userId = req.user.uid;
    const diagramId = req.params.id;
    const { email, permission } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (!isValidCollaboratorPermission(permission)) {
      return res.status(400).json({ success: false, message: 'Invalid permission level.' });
    }

    const doc = await loadDiagramOr404(res, diagramId);
    if (!doc) return;
    const data = doc.data();

    const accessLevel = getAccessLevel(data, userId);
    if (!canManageCollaborators(accessLevel)) {
      return res.status(403).json({ success: false, message: 'Only the owner can add collaborators.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const targetUser = await getUserByEmail(normalizedEmail);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'No iGraph IT user found with that email.' });
    }
    if (targetUser.user_id === data.user_id) {
      return res.status(400).json({ success: false, message: 'That person already owns this diagram.' });
    }

    const existing = data.collaborators || [];
    const already = existing.find((c) => c.user_id === targetUser.user_id);
    const now = new Date().toISOString();

    const updated = already
      ? existing.map((c) => (c.user_id === targetUser.user_id ? { ...c, permission } : c))
      : [...existing, { user_id: targetUser.user_id, permission, added_at: now }];

    // collaborator_ids is a plain string[] mirror of collaborators' user_ids —
    // Firestore can't query "does this array of objects contain one with
    // user_id == X", only array-contains on a plain-value array, which is
    // what getSavedDiagrams' "shared with me" query relies on.
    const updatedIds = Array.from(new Set(updated.map((c) => c.user_id)));

    await db.collection(COLLECTION).doc(diagramId).update({ collaborators: updated, collaborator_ids: updatedIds });

    res.status(200).json({
      success: true,
      message: already ? 'Access updated.' : 'Person added.',
      data: publicUser(targetUser.user_id, targetUser, permission),
    });
  } catch (error) {
    console.error('❌ Add collaborator error:', error);
    res.status(500).json({ success: false, message: 'Failed to add collaborator.' });
  }
};

const updateCollaboratorPermission = async (req, res) => {
  try {
    const userId = req.user.uid;
    const diagramId = req.params.id;
    const targetUserId = req.params.userId;
    const { permission } = req.body;

    if (!isValidCollaboratorPermission(permission)) {
      return res.status(400).json({ success: false, message: 'Invalid permission level.' });
    }

    const doc = await loadDiagramOr404(res, diagramId);
    if (!doc) return;
    const data = doc.data();

    const accessLevel = getAccessLevel(data, userId);
    if (!canManageCollaborators(accessLevel)) {
      return res.status(403).json({ success: false, message: 'Only the owner can change access.' });
    }

    const existing = data.collaborators || [];
    if (!existing.some((c) => c.user_id === targetUserId)) {
      return res.status(404).json({ success: false, message: 'That person does not have access to this diagram.' });
    }

    const updated = existing.map((c) => (c.user_id === targetUserId ? { ...c, permission } : c));
    await db.collection(COLLECTION).doc(diagramId).update({ collaborators: updated });
    notifyPermissionChange(diagramId, targetUserId, permission);

    res.status(200).json({ success: true, message: 'Access updated.' });
  } catch (error) {
    console.error('❌ Update collaborator permission error:', error);
    res.status(500).json({ success: false, message: 'Failed to update access.' });
  }
};

const removeCollaborator = async (req, res) => {
  try {
    const userId = req.user.uid;
    const diagramId = req.params.id;
    const targetUserId = req.params.userId;

    const doc = await loadDiagramOr404(res, diagramId);
    if (!doc) return;
    const data = doc.data();

    const accessLevel = getAccessLevel(data, userId);
    // A collaborator is always allowed to remove *themselves* ("leave"),
    // even without owner rights — everyone else needs to be the owner.
    const isSelfRemoval = targetUserId === userId;
    if (!canManageCollaborators(accessLevel) && !isSelfRemoval) {
      return res.status(403).json({ success: false, message: 'Only the owner can remove that person.' });
    }

    const existing = data.collaborators || [];
    const updated = existing.filter((c) => c.user_id !== targetUserId);
    const updatedIds = updated.map((c) => c.user_id);
    await db.collection(COLLECTION).doc(diagramId).update({ collaborators: updated, collaborator_ids: updatedIds });

    res.status(200).json({ success: true, message: 'Access removed.' });
  } catch (error) {
    console.error('❌ Remove collaborator error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove access.' });
  }
};

const updateShareLink = async (req, res) => {
  try {
    const userId = req.user.uid;
    const diagramId = req.params.id;
    const { enabled, permission } = req.body;

    if (permission !== undefined && !isValidShareLinkPermission(permission)) {
      return res.status(400).json({ success: false, message: 'Invalid permission level.' });
    }

    const doc = await loadDiagramOr404(res, diagramId);
    if (!doc) return;
    const data = doc.data();

    const accessLevel = getAccessLevel(data, userId);

    // Turning the link on/off (and by extension, copying it) is available to
    // edit_share too — but deciding *what* access the link grants is a bigger
    // call, reserved for the owner alone, same as adding/removing people.
    if (enabled !== undefined && !canManageShareLink(accessLevel)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to change the shareable link.' });
    }
    if (permission !== undefined && accessLevel !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only the owner can change what the link grants.' });
    }

    const current = data.share_link || { enabled: false, token: null, permission: 'edit' };
    const next = {
      enabled: enabled !== undefined ? !!enabled : current.enabled,
      permission: permission || current.permission || 'edit',
      // Generated once, then kept stable across on/off toggles so a link
      // that was already shared out doesn't silently die when re-enabled.
      token: current.token || uuidv4(),
    };

    await db.collection(COLLECTION).doc(diagramId).update({ share_link: next });

    res.status(200).json({
      success: true,
      data: { enabled: next.enabled, permission: next.permission, token: next.enabled ? next.token : null },
    });
  } catch (error) {
    console.error('❌ Update share link error:', error);
    res.status(500).json({ success: false, message: 'Failed to update the shareable link.' });
  }
};

// Visiting a share link doesn't require already being a collaborator — this
// is what turns "anyone signed in with the link" into an actual collaborator
// record, matching how e.g. Google Docs links work: opening it is what grants
// you standing access, which is why you then show up in the Collaborators list.
const redeemShareLink = async (req, res) => {
  try {
    const userId = req.user.uid;
    const token = req.params.token;

    const snapshot = await db.collection(COLLECTION).where('share_link.token', '==', token).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).json({ success: false, message: 'This share link is invalid or has expired.' });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const shareLink = data.share_link;

    if (!shareLink || !shareLink.enabled) {
      return res.status(403).json({ success: false, message: 'This share link is no longer active.' });
    }

    // Owner opening their own link, or a collaborator opening it, just goes
    // straight in — no need to touch their existing (possibly higher)
    // permission level.
    if (data.user_id === userId) {
      return res.status(200).json({ success: true, data: { diagramId: doc.id } });
    }

    const existing = data.collaborators || [];
    if (!existing.some((c) => c.user_id === userId)) {
      const now = new Date().toISOString();
      const updated = [...existing, { user_id: userId, permission: shareLink.permission, added_at: now }];
      const updatedIds = updated.map((c) => c.user_id);
      await db.collection(COLLECTION).doc(doc.id).update({ collaborators: updated, collaborator_ids: updatedIds });
    }

    res.status(200).json({ success: true, data: { diagramId: doc.id } });
  } catch (error) {
    console.error('❌ Redeem share link error:', error);
    res.status(500).json({ success: false, message: 'Failed to open the shared diagram.' });
  }
};

// ─── Access requests (View-only's "Request permission" flow) ───────────────

const requestAccess = async (req, res) => {
  try {
    const userId = req.user.uid;
    const diagramId = req.params.id;
    const message = typeof req.body.message === 'string' ? req.body.message.trim().slice(0, 500) : '';

    const doc = await loadDiagramOr404(res, diagramId);
    if (!doc) return;
    const data = doc.data();

    const accessLevel = getAccessLevel(data, userId);
    if (accessLevel !== 'view') {
      return res.status(400).json({ success: false, message: 'You already have edit access to this diagram.' });
    }

    const requester = await getUserById(userId);
    const existing = data.access_requests || [];
    const now = new Date().toISOString();
    // Replaces any earlier pending request from this same person rather than
    // piling up duplicates every time they click the button again.
    const updated = [
      ...existing.filter((r) => r.user_id !== userId),
      {
        user_id: userId,
        email: requester?.email || '',
        full_name: requester?.full_name || 'Someone',
        message,
        requested_at: now,
      },
    ];

    await db.collection(COLLECTION).doc(diagramId).update({ access_requests: updated });

    res.status(200).json({ success: true, message: 'Request sent.' });
  } catch (error) {
    console.error('❌ Request access error:', error);
    res.status(500).json({ success: false, message: 'Failed to send request.' });
  }
};

const approveAccessRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const diagramId = req.params.id;
    const targetUserId = req.params.userId;
    const permission = isValidCollaboratorPermission(req.body.permission) ? req.body.permission : 'edit';

    const doc = await loadDiagramOr404(res, diagramId);
    if (!doc) return;
    const data = doc.data();

    const accessLevel = getAccessLevel(data, userId);
    if (!canManageCollaborators(accessLevel)) {
      return res.status(403).json({ success: false, message: 'Only the owner can approve access requests.' });
    }

    const requests = data.access_requests || [];
    if (!requests.some((r) => r.user_id === targetUserId)) {
      return res.status(404).json({ success: false, message: 'That request no longer exists.' });
    }

    const existingCollaborators = data.collaborators || [];
    const already = existingCollaborators.find((c) => c.user_id === targetUserId);
    const now = new Date().toISOString();
    const updatedCollaborators = already
      ? existingCollaborators.map((c) => (c.user_id === targetUserId ? { ...c, permission } : c))
      : [...existingCollaborators, { user_id: targetUserId, permission, added_at: now }];
    const updatedIds = Array.from(new Set(updatedCollaborators.map((c) => c.user_id)));
    const updatedRequests = requests.filter((r) => r.user_id !== targetUserId);

    await db.collection(COLLECTION).doc(diagramId).update({
      collaborators: updatedCollaborators,
      collaborator_ids: updatedIds,
      access_requests: updatedRequests,
    });
    notifyPermissionChange(diagramId, targetUserId, permission);

    res.status(200).json({ success: true, message: 'Access granted.' });
  } catch (error) {
    console.error('❌ Approve access request error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve request.' });
  }
};

const denyAccessRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const diagramId = req.params.id;
    const targetUserId = req.params.userId;

    const doc = await loadDiagramOr404(res, diagramId);
    if (!doc) return;
    const data = doc.data();

    const accessLevel = getAccessLevel(data, userId);
    if (!canManageCollaborators(accessLevel)) {
      return res.status(403).json({ success: false, message: 'Only the owner can deny access requests.' });
    }

    const requests = data.access_requests || [];
    const updatedRequests = requests.filter((r) => r.user_id !== targetUserId);
    await db.collection(COLLECTION).doc(diagramId).update({ access_requests: updatedRequests });

    res.status(200).json({ success: true, message: 'Request denied.' });
  } catch (error) {
    console.error('❌ Deny access request error:', error);
    res.status(500).json({ success: false, message: 'Failed to deny request.' });
  }
};

module.exports = {
  getShareSettings,
  addCollaborator,
  updateCollaboratorPermission,
  removeCollaborator,
  updateShareLink,
  redeemShareLink,
  requestAccess,
  approveAccessRequest,
  denyAccessRequest,
};