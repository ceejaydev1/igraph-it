// Controller-level tests for the permission gates in shareController.js.
// Firestore, the user model, uuid, and the realtime notify hook are all
// mocked — nothing here touches a real database or socket connection.

jest.mock('../config/firebase', () => ({
  db: { collection: jest.fn() },
}));
jest.mock('uuid', () => ({ v4: () => 'mock-token' }));
jest.mock('../models/userModel', () => ({
  getUserByEmail: jest.fn(),
  getUserById: jest.fn(),
}));
jest.mock('../services/collabSocket', () => ({
  notifyPermissionChange: jest.fn(),
}));

const { db } = require('../config/firebase');
const { getUserByEmail, getUserById } = require('../models/userModel');
const {
  addCollaborator,
  updateCollaboratorPermission,
  removeCollaborator,
  updateShareLink,
  redeemShareLink,
  requestAccess,
  approveAccessRequest,
  denyAccessRequest,
} = require('../controllers/shareController');

function mockDiagramDoc(data) {
  const docRef = {
    get: jest.fn().mockResolvedValue({ exists: data !== null, data: () => data }),
    update: jest.fn().mockResolvedValue(undefined),
  };
  db.collection.mockReturnValue({ doc: jest.fn().mockReturnValue(docRef) });
  return docRef;
}

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

beforeEach(() => {
  jest.clearAllMocks();
  getUserById.mockResolvedValue({ full_name: 'Some User', email: 'user@example.com' });
});

describe('addCollaborator', () => {
  const diagram = { diagram_id: 'd1', user_id: 'owner1', collaborators: [{ user_id: 'sharer1', permission: 'edit_share' }] };

  test('an edit_share collaborator cannot add people — only the owner can', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'sharer1' }, params: { id: 'd1' }, body: { email: 'new@example.com', permission: 'edit' } };
    const res = mockRes();

    await addCollaborator(req, res);

    expect(docRef.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('the owner can add a new collaborator', async () => {
    const docRef = mockDiagramDoc(diagram);
    getUserByEmail.mockResolvedValue({ user_id: 'new1', email: 'new@example.com' });
    const req = { user: { uid: 'owner1' }, params: { id: 'd1' }, body: { email: 'new@example.com', permission: 'edit' } };
    const res = mockRes();

    await addCollaborator(req, res);

    expect(docRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ collaborators: expect.arrayContaining([expect.objectContaining({ user_id: 'new1', permission: 'edit' })]) })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('rejects an invalid permission level before touching Firestore', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'owner1' }, params: { id: 'd1' }, body: { email: 'new@example.com', permission: 'owner' } };
    const res = mockRes();

    await addCollaborator(req, res);

    expect(docRef.get).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('updateCollaboratorPermission', () => {
  const diagram = { diagram_id: 'd1', user_id: 'owner1', collaborators: [{ user_id: 'editor1', permission: 'edit' }] };

  test('a non-owner collaborator cannot change another collaborator\'s permission', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'editor1' }, params: { id: 'd1', userId: 'editor1' }, body: { permission: 'edit_share' } };
    const res = mockRes();

    await updateCollaboratorPermission(req, res);

    expect(docRef.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('the owner can upgrade a collaborator\'s permission', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'owner1' }, params: { id: 'd1', userId: 'editor1' }, body: { permission: 'edit_share' } };
    const res = mockRes();

    await updateCollaboratorPermission(req, res);

    expect(docRef.update).toHaveBeenCalledWith({
      collaborators: [{ user_id: 'editor1', permission: 'edit_share' }],
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('removeCollaborator', () => {
  const diagram = {
    diagram_id: 'd1',
    user_id: 'owner1',
    collaborators: [
      { user_id: 'editor1', permission: 'edit' },
      { user_id: 'editor2', permission: 'edit' },
    ],
  };

  test('a collaborator can remove themselves (leave) without owner rights', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'editor1' }, params: { id: 'd1', userId: 'editor1' } };
    const res = mockRes();

    await removeCollaborator(req, res);

    expect(docRef.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('a collaborator cannot remove someone else', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'editor1' }, params: { id: 'd1', userId: 'editor2' } };
    const res = mockRes();

    await removeCollaborator(req, res);

    expect(docRef.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('the owner can remove anyone', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'owner1' }, params: { id: 'd1', userId: 'editor2' } };
    const res = mockRes();

    await removeCollaborator(req, res);

    expect(docRef.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('updateShareLink', () => {
  const diagram = {
    diagram_id: 'd1',
    user_id: 'owner1',
    collaborators: [{ user_id: 'sharer1', permission: 'edit_share' }, { user_id: 'editor1', permission: 'edit' }],
    share_link: { enabled: false, token: 'existing-token', permission: 'edit' },
  };

  test('a plain "edit" collaborator cannot toggle the share link on', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'editor1' }, params: { id: 'd1' }, body: { enabled: true } };
    const res = mockRes();

    await updateShareLink(req, res);

    expect(docRef.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('an edit_share collaborator can toggle the link on', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'sharer1' }, params: { id: 'd1' }, body: { enabled: true } };
    const res = mockRes();

    await updateShareLink(req, res);

    expect(docRef.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('an edit_share collaborator cannot change what the link grants, even while toggling it', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'sharer1' }, params: { id: 'd1' }, body: { enabled: true, permission: 'edit_share' } };
    const res = mockRes();

    await updateShareLink(req, res);

    expect(docRef.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('the owner can change what the link grants', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'owner1' }, params: { id: 'd1' }, body: { permission: 'view' } };
    const res = mockRes();

    await updateShareLink(req, res);

    expect(docRef.update).toHaveBeenCalledWith({ share_link: expect.objectContaining({ permission: 'view' }) });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('redeemShareLink', () => {
  test('a disabled link is rejected even if the token matches', async () => {
    const diagram = { diagram_id: 'd1', user_id: 'owner1', share_link: { enabled: false, token: 't1', permission: 'edit' } };
    db.collection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: false, docs: [{ id: 'd1', data: () => diagram }] }),
    });
    const req = { user: { uid: 'newperson' }, params: { token: 't1' } };
    const res = mockRes();

    await redeemShareLink(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('an unknown token returns 404, not a diagram id', async () => {
    db.collection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    });
    const req = { user: { uid: 'newperson' }, params: { token: 'bogus' } };
    const res = mockRes();

    await redeemShareLink(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('redeeming a valid, enabled link grants the link\'s permission level and adds the user as a collaborator', async () => {
    const diagram = { diagram_id: 'd1', user_id: 'owner1', collaborators: [], share_link: { enabled: true, token: 't1', permission: 'edit' } };
    const updateFn = jest.fn().mockResolvedValue(undefined);
    db.collection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: false, docs: [{ id: 'd1', data: () => diagram }] }),
      doc: jest.fn().mockReturnValue({ update: updateFn }),
    });
    const req = { user: { uid: 'newperson' }, params: { token: 't1' } };
    const res = mockRes();

    await redeemShareLink(req, res);

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ collaborators: expect.arrayContaining([expect.objectContaining({ user_id: 'newperson', permission: 'edit' })]) })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('requestAccess', () => {
  test('someone who already has edit access cannot file a request', async () => {
    const diagram = { diagram_id: 'd1', user_id: 'owner1', collaborators: [{ user_id: 'editor1', permission: 'edit' }] };
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'editor1' }, params: { id: 'd1' }, body: { message: 'let me edit' } };
    const res = mockRes();

    await requestAccess(req, res);

    expect(docRef.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('a view-only collaborator can file a request', async () => {
    const diagram = { diagram_id: 'd1', user_id: 'owner1', collaborators: [{ user_id: 'viewer1', permission: 'view' }] };
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'viewer1' }, params: { id: 'd1' }, body: { message: 'let me edit' } };
    const res = mockRes();

    await requestAccess(req, res);

    expect(docRef.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('approveAccessRequest / denyAccessRequest', () => {
  const diagram = {
    diagram_id: 'd1',
    user_id: 'owner1',
    collaborators: [{ user_id: 'sharer1', permission: 'edit_share' }],
    access_requests: [{ user_id: 'viewer1' }],
  };

  test('an edit_share collaborator cannot approve access requests — owner only', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'sharer1' }, params: { id: 'd1', userId: 'viewer1' }, body: {} };
    const res = mockRes();

    await approveAccessRequest(req, res);

    expect(docRef.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('the owner can approve a request', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'owner1' }, params: { id: 'd1', userId: 'viewer1' }, body: { permission: 'edit' } };
    const res = mockRes();

    await approveAccessRequest(req, res);

    expect(docRef.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('an edit_share collaborator cannot deny access requests — owner only', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'sharer1' }, params: { id: 'd1', userId: 'viewer1' } };
    const res = mockRes();

    await denyAccessRequest(req, res);

    expect(docRef.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
