const admin = require('firebase-admin');

if (!admin.apps.length) {
  // You need to add the project ID explicitly for token verification
  const projectId = process.env.FIREBASE_PROJECT_ID;
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined
    }),
    // 🔑 THIS IS CRITICAL FOR GOOGLE AUTH
    projectId: projectId,
  });

  console.log('✅ Firebase Admin SDK initialized with project:', projectId);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth, admin };