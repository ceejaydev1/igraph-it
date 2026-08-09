const {
  getAccessLevel,
  canView,
  canEdit,
  canManageShareLink,
  canRename,
  canManageCollaborators,
  isValidCollaboratorPermission,
  isValidShareLinkPermission,
} = require('../utils/diagramAccess');

describe('getAccessLevel', () => {
  test('owner gets "owner" regardless of any collaborator entry', () => {
    const diagram = { user_id: 'u1', collaborators: [{ user_id: 'u1', permission: 'view' }] };
    expect(getAccessLevel(diagram, 'u1')).toBe('owner');
  });

  test('collaborator gets their stored permission', () => {
    const diagram = { user_id: 'owner1', collaborators: [{ user_id: 'u2', permission: 'edit' }] };
    expect(getAccessLevel(diagram, 'u2')).toBe('edit');
  });

  test('a user with no matching collaborator entry gets null', () => {
    const diagram = { user_id: 'owner1', collaborators: [{ user_id: 'u2', permission: 'edit' }] };
    expect(getAccessLevel(diagram, 'stranger')).toBeNull();
  });

  test('missing collaborators array is treated as empty, not a crash', () => {
    const diagram = { user_id: 'owner1' };
    expect(getAccessLevel(diagram, 'u2')).toBeNull();
  });

  test('missing diagramData or userId returns null', () => {
    expect(getAccessLevel(null, 'u1')).toBeNull();
    expect(getAccessLevel({ user_id: 'u1' }, null)).toBeNull();
  });
});

describe('canView', () => {
  test.each(['owner', 'edit', 'edit_share', 'view'])('%s can view', (level) => {
    expect(canView(level)).toBe(true);
  });

  test('null (no access) cannot view', () => {
    expect(canView(null)).toBe(false);
  });
});

describe('canEdit', () => {
  test.each(['owner', 'edit', 'edit_share'])('%s can edit', (level) => {
    expect(canEdit(level)).toBe(true);
  });

  test.each(['view', null, undefined])('%s cannot edit', (level) => {
    expect(canEdit(level)).toBe(false);
  });
});

describe('canRename', () => {
  test.each(['owner', 'edit_share'])('%s can rename', (level) => {
    expect(canRename(level)).toBe(true);
  });

  // A plain 'edit' collaborator can change content but must not be able to
  // retitle the diagram out from under everyone else — this is the exact
  // boundary saveDiagram's `allowRename` check in diagramController.js relies on.
  test.each(['edit', 'view', null])('%s cannot rename', (level) => {
    expect(canRename(level)).toBe(false);
  });
});

describe('canManageShareLink', () => {
  test.each(['owner', 'edit_share'])('%s can manage the share link', (level) => {
    expect(canManageShareLink(level)).toBe(true);
  });

  test.each(['edit', 'view', null])('%s cannot manage the share link', (level) => {
    expect(canManageShareLink(level)).toBe(false);
  });
});

describe('canManageCollaborators', () => {
  test('only owner can manage collaborators', () => {
    expect(canManageCollaborators('owner')).toBe(true);
  });

  test.each(['edit_share', 'edit', 'view', null])('%s cannot manage collaborators', (level) => {
    expect(canManageCollaborators(level)).toBe(false);
  });
});

describe('isValidCollaboratorPermission', () => {
  test.each(['view', 'edit', 'edit_share'])('%s is a valid collaborator permission', (p) => {
    expect(isValidCollaboratorPermission(p)).toBe(true);
  });

  // 'owner' must never be assignable as a collaborator permission — it's
  // derived solely from diagramData.user_id, not something a share action
  // should ever be able to grant to a second person.
  test.each(['owner', 'admin', '', null, undefined])('%s is not a valid collaborator permission', (p) => {
    expect(isValidCollaboratorPermission(p)).toBe(false);
  });
});

describe('isValidShareLinkPermission', () => {
  test.each(['view', 'edit', 'edit_share'])('%s is a valid share link permission', (p) => {
    expect(isValidShareLinkPermission(p)).toBe(true);
  });

  test.each(['owner', 'admin', '', null, undefined])('%s is not a valid share link permission', (p) => {
    expect(isValidShareLinkPermission(p)).toBe(false);
  });
});
