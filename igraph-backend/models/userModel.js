const { db } = require('../config/firebase');

const COLLECTION = 'students';

const createUser = async (userId, userData) => {
  const now = new Date().toISOString();

  const userDoc = {
    user_id: userId,
    full_name: userData.fullName,
    username: userData.username,
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

const isUsernameExists = async (username) => {
  const snapshot = await db.collection(COLLECTION)
    .where('username', '==', username)
    .limit(1)
    .get();

  return !snapshot.empty;
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

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  isUsernameExists,
  updateUser,
  markUserVerified,
  updatePasswordHash
};
