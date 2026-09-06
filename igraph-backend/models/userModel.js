const { db } = require('../config/firebase');

const COLLECTION = 'students';

const createUser = async (userId, userData) => {
  const now = new Date().toISOString();

  const userDoc = {
    user_id: userId,
    full_name: userData.fullName,
    email: userData.email,
    password_hash: userData.passwordHash || null,
    is_verified: userData.isVerified || false,
    profile_picture: userData.profilePicture || null,
    auth_provider: userData.authProvider || 'email',
    created_at: now,
    updated_at: now
  };

  await db.collection(COLLECTION).doc(userId).set(userDoc);
  return userDoc;
};

const getUserById = async (userId) => {
  const doc = await db.collection(COLLECTION).doc(userId).get();
  if (!doc.exists) return null;
  return doc.data();
};

const getUserByEmail = async (email) => {
  const snapshot = await db.collection(COLLECTION)
    .where('email', '==', email)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
};

const updateUser = async (userId, updates) => {
  updates.updated_at = new Date().toISOString();
  await db.collection(COLLECTION).doc(userId).update(updates);
};

const markUserVerified = async (userId) => {
  await updateUser(userId, { is_verified: true });
};

const updatePasswordHash = async (userId, newPasswordHash) => {
  await updateUser(userId, { password_hash: newPasswordHash });
};

// Cross-device "what was I last working on" pointer — separate from the
// frontend's own AsyncStorage/localStorage pointer, which never leaves the
// browser it was written on. Storing this on the user doc instead means any
// device signing into the same account can ask "what should /create resume"
// and get a real answer, not just a device-local guess.
const setActiveDiagram = async (userId, diagramId) => {
  await updateUser(userId, { last_active_diagram_id: diagramId || null });
};

const getActiveDiagram = async (userId) => {
  const user = await getUserById(userId);
  return user?.last_active_diagram_id || null;
};

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  markUserVerified,
  updatePasswordHash,
  setActiveDiagram,
  getActiveDiagram
};