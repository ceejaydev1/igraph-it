// Controller-level tests for the permission gates in diagramController.js.
// Firestore is fully mocked here — nothing in this file ever touches a real
// database, so it's safe to run against production credentials.

jest.mock('../config/firebase', () => ({
  db: { collection: jest.fn() },
}));

// uuid v14 ships ESM-only, which Jest's default CJS resolution can't parse
// (diagramController.js only uses this to mint an id for brand-new
// diagrams — a real value is never asserted on in these tests).
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

const { db } = require('../config/firebase');
const {
  saveDiagram,
  getDiagram,
  renameDiagram,
  deleteDiagram,
} = require('../controllers/diagramController');

const VALID_XML = '<mxGraphModel><root><mxCell id="1" value="box"/></root></mxGraphModel>';

// Wires db.collection(...).doc(...) to resolve to `data` (or a
// non-existent doc when data is null), and returns the doc ref's
// update/set/delete spies so a test can assert on what was written.
function mockDiagramDoc(data) {
  const docRef = {
    get: jest.fn().mockResolvedValue({
      exists: data !== null,
      data: () => data,
    }),
    update: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  db.collection.mockReturnValue({ doc: jest.fn().mockReturnValue(docRef) });
  return docRef;
}

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('saveDiagram — updating an existing diagram', () => {
  const baseDiagram = {
    diagram_id: 'd1',
    user_id: 'owner1',
    name: 'Original',
    xml: '<old/>',
    pages: [],
    created_at: '2026-01-01T00:00:00.000Z',
  };

  test('owner can save', async () => {
    const docRef = mockDiagramDoc(baseDiagram);
    const req = { user: { uid: 'owner1' }, body: { id: 'd1', name: 'Updated', xml: VALID_XML } };
    const res = mockRes();

    await saveDiagram(req, res);

    expect(docRef.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('a collaborator with only "view" access is rejected with 403 and no write', async () => {
    const diagram = { ...baseDiagram, collaborators: [{ user_id: 'viewer1', permission: 'view' }] };
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'viewer1' }, body: { id: 'd1', name: 'Hacked', xml: VALID_XML } };
    const res = mockRes();

    await saveDiagram(req, res);

    expect(docRef.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('a user with no relationship to the diagram at all is rejected with 403', async () => {
    const docRef = mockDiagramDoc(baseDiagram);
    const req = { user: { uid: 'stranger' }, body: { id: 'd1', name: 'Hacked', xml: VALID_XML } };
    const res = mockRes();

    await saveDiagram(req, res);

    expect(docRef.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('a plain "edit" collaborator can change content but the title is silently kept, not overwritten', async () => {
    const diagram = { ...baseDiagram, collaborators: [{ user_id: 'editor1', permission: 'edit' }] };
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'editor1' }, body: { id: 'd1', name: 'Renamed by editor', xml: VALID_XML } };
    const res = mockRes();

    await saveDiagram(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const writePayload = docRef.update.mock.calls[0][0];
    expect(writePayload).not.toHaveProperty('name');
    expect(writePayload.xml).toBe(VALID_XML);
  });

  test('an "edit_share" collaborator can rename as part of a save', async () => {
    const diagram = { ...baseDiagram, collaborators: [{ user_id: 'sharer1', permission: 'edit_share' }] };
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'sharer1' }, body: { id: 'd1', name: 'Renamed by edit_share', xml: VALID_XML } };
    const res = mockRes();

    await saveDiagram(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(docRef.update.mock.calls[0][0].name).toBe('Renamed by edit_share');
  });

  test('saving a nonexistent diagram id returns 404', async () => {
    mockDiagramDoc(null);
    const req = { user: { uid: 'owner1' }, body: { id: 'missing-id', name: 'X', xml: VALID_XML } };
    const res = mockRes();

    await saveDiagram(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('rejects empty xml content with 400 before ever touching Firestore', async () => {
    const docRef = mockDiagramDoc(baseDiagram);
    const req = { user: { uid: 'owner1' }, body: { id: 'd1', name: 'X', xml: '<mxGraphModel/>' } };
    const res = mockRes();

    await saveDiagram(req, res);

    expect(docRef.get).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('saveDiagram — creating a new diagram (no id)', () => {
  test('creates a fresh diagram owned by the requesting user', async () => {
    db.collection.mockReturnValue({ doc: jest.fn().mockReturnValue({ set: jest.fn().mockResolvedValue(undefined) }) });
    const req = { user: { uid: 'newowner' }, body: { name: 'Brand new', xml: VALID_XML } };
    const res = mockRes();

    await saveDiagram(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('getDiagram', () => {
  const diagram = {
    diagram_id: 'd1',
    user_id: 'owner1',
    name: 'Some diagram',
    xml: '<xml/>',
    collaborators: [{ user_id: 'viewer1', permission: 'view' }],
    access_requests: [{ user_id: 'requester1' }],
  };

  test('a user not on the diagram at all gets 403, not diagram content', async () => {
    mockDiagramDoc(diagram);
    const req = { user: { uid: 'stranger' }, params: { id: 'd1' } };
    const res = mockRes();

    await getDiagram(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.anything() }));
  });

  test('a view-only collaborator can read the diagram', async () => {
    mockDiagramDoc(diagram);
    const req = { user: { uid: 'viewer1' }, params: { id: 'd1' } };
    const res = mockRes();

    await getDiagram(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.accessLevel).toBe('view');
  });

  test('reports a pending access request for the requesting user', async () => {
    mockDiagramDoc(diagram);
    const req = { user: { uid: 'requester1' }, params: { id: 'd1' } };
    const res = mockRes();

    await getDiagram(req, res);

    // requester1 has no collaborator entry, so this is really asserting
    // the 403 path leaves no room for hasPendingAccessRequest to leak
    // diagram content to someone who was never granted access.
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('renameDiagram', () => {
  const diagram = {
    diagram_id: 'd1',
    user_id: 'owner1',
    name: 'Old name',
    collaborators: [
      { user_id: 'editor1', permission: 'edit' },
      { user_id: 'sharer1', permission: 'edit_share' },
    ],
  };

  test('a plain "edit" collaborator gets 403 renaming directly (matches the saveDiagram boundary)', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'editor1' }, params: { id: 'd1' }, body: { name: 'New name' } };
    const res = mockRes();

    await renameDiagram(req, res);

    expect(docRef.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('an "edit_share" collaborator can rename', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'sharer1' }, params: { id: 'd1' }, body: { name: 'New name' } };
    const res = mockRes();

    await renameDiagram(req, res);

    expect(docRef.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'New name' }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('rejects a blank name without touching Firestore', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'owner1' }, params: { id: 'd1' }, body: { name: '   ' } };
    const res = mockRes();

    await renameDiagram(req, res);

    expect(docRef.get).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('deleteDiagram', () => {
  const diagram = {
    diagram_id: 'd1',
    user_id: 'owner1',
    name: 'Some diagram',
    collaborators: [{ user_id: 'sharer1', permission: 'edit_share' }],
  };

  test('only the owner can delete — an edit_share collaborator is rejected', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'sharer1' }, params: { id: 'd1' } };
    const res = mockRes();

    await deleteDiagram(req, res);

    expect(docRef.delete).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('the owner can delete', async () => {
    const docRef = mockDiagramDoc(diagram);
    const req = { user: { uid: 'owner1' }, params: { id: 'd1' } };
    const res = mockRes();

    await deleteDiagram(req, res);

    expect(docRef.delete).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
