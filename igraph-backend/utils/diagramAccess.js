// Central place for "what can this user do with this diagram" — every
// diagram-touching route (REST CRUD, share settings, and the realtime socket
// layer) funnels through here so the permission rules only ever live once.
//
// Levels, from least to most access:
//   view       — open/read only, can't edit or share
//   edit       — can edit the diagram canvas; the share link/collaborators
//                are not even shown to them
//   edit_share — edit, plus can see and toggle on/off + copy the shareable
//                link. Does NOT include managing collaborators or changing
//                the link's own permission level — that's owner-only.
//   owner      — everything: manage collaborators, change the link's
//                permission level, rename/delete, approve/deny access requests

const getAccessLevel = (diagramData, userId) => {
  if (!diagramData || !userId) return null;
  if (diagramData.user_id === userId) return 'owner';
  const collaborator = (diagramData.collaborators || []).find((c) => c.user_id === userId);
  return collaborator ? collaborator.permission : null;
};

const canView = (level) => level != null;

const canEdit = (level) => level === 'owner' || level === 'edit' || level === 'edit_share';

// Toggling the link on/off and copying it — not the same as deciding *who*
// has access (that's canManageCollaborators, owner-only).
const canManageShareLink = (level) => level === 'owner' || level === 'edit_share';

const canManageCollaborators = (level) => level === 'owner';

const isValidCollaboratorPermission = (permission) =>
  ['view', 'edit', 'edit_share'].includes(permission);

const isValidShareLinkPermission = (permission) =>
  ['view', 'edit', 'edit_share'].includes(permission);

module.exports = {
  getAccessLevel,
  canView,
  canEdit,
  canManageShareLink,
  canManageCollaborators,
  isValidCollaboratorPermission,
  isValidShareLinkPermission,
};