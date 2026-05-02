const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const COLLECTION = 'otp_codes';

const createOTP = async (userId, otpCode, purpose, expiresAt) => {
  const otpId = uuidv4();

  const otpDoc = {
    otp_id: otpId,
    user_id: userId,
    otp_code: otpCode,
    purpose: purpose,
    expires_at: expiresAt.toISOString(),
    is_used: false,
    created_at: new Date().toISOString()
  };

  await db.collection(COLLECTION).doc(otpId).set(otpDoc);
  return otpDoc;
};

const getValidOTP = async (userId, purpose) => {
  const now = new Date().toISOString();

  const snapshot = await db.collection(COLLECTION)
    .where('user_id', '==', userId)
    .where('purpose', '==', purpose)
    .where('is_used', '==', false)
    .orderBy('created_at', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const otp = snapshot.docs[0].data();

  if (otp.expires_at < now) return null;

  return otp;
};

const markOTPUsed = async (otpId) => {
  await db.collection(COLLECTION).doc(otpId).update({
    is_used: true
  });
};

const invalidateAllOTPs = async (userId, purpose) => {
  const snapshot = await db.collection(COLLECTION)
    .where('user_id', '==', userId)
    .where('purpose', '==', purpose)
    .where('is_used', '==', false)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { is_used: true });
  });

  await batch.commit();
};

module.exports = {
  createOTP,
  getValidOTP,
  markOTPUsed,
  invalidateAllOTPs
};

//test