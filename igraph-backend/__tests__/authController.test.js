// Controller-level tests for the highest-risk auth flows: signing in,
// refreshing a session, and changing a password. Firestore and Firebase
// Auth are fully mocked; bcrypt and jsonwebtoken run for real against
// test-only secrets, so password/token verification is genuinely exercised
// rather than assumed.

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

jest.mock('../config/firebase', () => ({
  db: { collection: jest.fn(), batch: jest.fn() },
  auth: { updateUser: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../models/userModel');
jest.mock('uuid', () => ({ v4: () => 'mock-session-id' }));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, auth } = require('../config/firebase');
const userModel = require('../models/userModel');
const { signin, refreshToken, changePassword } = require('../controllers/authController');

// Firestore's fluent query builder (.where().where().limit().get()) — every
// method but the terminal .get() just needs to return `this` so chains of
// any length resolve to the same mock.
function chainableQuery(result) {
  const query = {
    where: jest.fn(() => query),
    limit: jest.fn(() => query),
    get: jest.fn().mockResolvedValue(result),
  };
  return query;
}

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
}

const REAL_PASSWORD = 'CorrectHorseBattery9!';
let realPasswordHash;

beforeAll(async () => {
  realPasswordHash = await bcrypt.hash(REAL_PASSWORD, 12);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('signin', () => {
  // Built fresh per test (not a plain top-level const) because
  // realPasswordHash is only assigned inside beforeAll — a describe body
  // runs during test collection, before any hook, so capturing it directly
  // here would freeze in `undefined`.
  let baseUser;
  beforeEach(() => {
    baseUser = {
      user_id: 'u1',
      email: 'person@example.com',
      full_name: 'Person',
      password_hash: realPasswordHash,
      is_verified: true,
      auth_provider: 'email',
    };
  });

  test('wrong password is rejected and no session is created', async () => {
    userModel.getUserByEmail.mockResolvedValue(baseUser);
    const sessionSet = jest.fn();
    db.collection.mockReturnValue({ doc: () => ({ set: sessionSet }) });

    const req = { body: { email: baseUser.email, password: 'totally-wrong' }, headers: {} };
    const res = mockRes();

    await signin(req, res);

    expect(sessionSet).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  test('unknown email is rejected with the same generic message as a wrong password (no user enumeration)', async () => {
    userModel.getUserByEmail.mockResolvedValue(null);
    const req = { body: { email: 'nobody@example.com', password: 'whatever' }, headers: {} };
    const res = mockRes();

    await signin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].message).toBe('Invalid email or password.');
  });

  test('an unverified account is blocked even with the correct password', async () => {
    userModel.getUserByEmail.mockResolvedValue({ ...baseUser, is_verified: false });
    const req = { body: { email: baseUser.email, password: REAL_PASSWORD }, headers: {} };
    const res = mockRes();

    await signin(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('EMAIL_NOT_VERIFIED');
  });

  test('a Google-only account (no password set) cannot sign in with a password', async () => {
    userModel.getUserByEmail.mockResolvedValue({ ...baseUser, auth_provider: 'google', password_hash: null });
    const req = { body: { email: baseUser.email, password: 'anything' }, headers: {} };
    const res = mockRes();

    await signin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].code).toBe('GOOGLE_ACCOUNT');
  });

  test('correct credentials create a session and set both cookies', async () => {
    userModel.getUserByEmail.mockResolvedValue(baseUser);
    const sessionSet = jest.fn().mockResolvedValue(undefined);
    db.collection.mockReturnValue({ doc: () => ({ set: sessionSet }) });

    const req = { body: { email: baseUser.email, password: REAL_PASSWORD, rememberMe: true }, headers: {} };
    const res = mockRes();

    await signin(req, res);

    expect(sessionSet).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', session_id: 'mock-session-id' }));
    expect(res.cookie).toHaveBeenCalledWith('access_token', expect.any(String), expect.anything());
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', expect.any(String), expect.anything());
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('refreshToken', () => {
  test('a garbage/tampered token is rejected', async () => {
    const req = { body: { refreshToken: 'not-a-real-token' }, cookies: {} };
    const res = mockRes();

    await refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('an access token used where a refresh token is expected is rejected (wrong "type" claim)', async () => {
    const accessToken = jwt.sign({ uid: 'u1', type: 'access' }, process.env.JWT_REFRESH_SECRET, { issuer: 'igraph-it' });
    const req = { body: { refreshToken: accessToken }, cookies: {} };
    const res = mockRes();

    await refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].message).toBe('Invalid token type.');
  });

  test('a validly-signed refresh token with no matching session (e.g. already logged out) is rejected', async () => {
    const token = jwt.sign({ uid: 'u1', type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { issuer: 'igraph-it' });
    db.collection.mockReturnValue(chainableQuery({ empty: true }));
    const req = { body: { refreshToken: token }, cookies: {} };
    const res = mockRes();

    await refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('a valid refresh token with a live session issues a new access token', async () => {
    const token = jwt.sign({ uid: 'u1', type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { issuer: 'igraph-it' });
    db.collection.mockReturnValue(chainableQuery({ empty: false, docs: [{ id: 's1' }] }));
    userModel.getUserById.mockResolvedValue({ user_id: 'u1', email: 'person@example.com' });

    const req = { body: { refreshToken: token }, cookies: {} };
    const res = mockRes();

    await refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const newAccessToken = res.json.mock.calls[0][0].data.accessToken;
    expect(() => jwt.verify(newAccessToken, process.env.JWT_ACCESS_SECRET, { issuer: 'igraph-it', audience: 'igraph-it-users' })).not.toThrow();
  });
});

describe('changePassword', () => {
  // Same lazy-build reasoning as signin's baseUser above.
  let user;
  beforeEach(() => {
    user = {
      user_id: 'u1',
      email: 'person@example.com',
      password_hash: realPasswordHash,
      auth_provider: 'email',
    };
  });

  test('wrong current password is rejected and the hash is never touched', async () => {
    userModel.getUserById.mockResolvedValue(user);
    const req = {
      user: { uid: 'u1' },
      body: { currentPassword: 'wrong-one', newPassword: 'NewStrongPass9!' },
      cookies: {},
    };
    const res = mockRes();

    await changePassword(req, res);

    expect(userModel.updatePasswordHash).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('a new password failing the complexity rules is rejected before checking the current password', async () => {
    userModel.getUserById.mockResolvedValue(user);
    const req = {
      user: { uid: 'u1' },
      body: { currentPassword: REAL_PASSWORD, newPassword: 'allweaklowercase' },
      cookies: {},
    };
    const res = mockRes();

    await changePassword(req, res);

    expect(userModel.getUserById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('correct current password + strong new password updates the hash and revokes other sessions but keeps the current one', async () => {
    userModel.getUserById.mockResolvedValue(user);
    userModel.updatePasswordHash.mockResolvedValue(undefined);

    const otherSessionDoc = { ref: { id: 'other' }, data: () => ({ refresh_token: 'other-token' }) };
    const currentSessionDoc = { ref: { id: 'current' }, data: () => ({ refresh_token: 'my-current-token' }) };
    const batchDelete = jest.fn();
    const batchCommit = jest.fn().mockResolvedValue(undefined);
    db.batch.mockReturnValue({ delete: batchDelete, commit: batchCommit });
    db.collection.mockReturnValue(chainableQuery({ docs: [otherSessionDoc, currentSessionDoc] }));

    const req = {
      user: { uid: 'u1' },
      body: { currentPassword: REAL_PASSWORD, newPassword: 'NewStrongPass9!' },
      cookies: { refresh_token: 'my-current-token' },
    };
    const res = mockRes();

    await changePassword(req, res);

    expect(userModel.updatePasswordHash).toHaveBeenCalledWith('u1', expect.any(String));
    expect(auth.updateUser).toHaveBeenCalledWith('u1', { password: 'NewStrongPass9!' });
    // Only the other device's session gets deleted — the one making this
    // request is deliberately spared so the user isn't logged out of the
    // screen they just used to change their own password.
    expect(batchDelete).toHaveBeenCalledTimes(1);
    expect(batchDelete).toHaveBeenCalledWith(otherSessionDoc.ref);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
