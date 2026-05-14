const admin = require('firebase-admin');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined
    }),
    projectId: projectId,
    // ✅ Add these for faster connections
    databaseURL: `https://${projectId}.firebaseio.com`,
    storageBucket: `${projectId}.firebasestorage.app`,
  });

  console.log('✅ Firebase Admin SDK initialized with project:', projectId);
}

const db = admin.firestore();
const auth = admin.auth();

// ✅ Optimize Firestore settings
db.settings({
  ignoreUndefinedProperties: true,
  // For production
  ...(process.env.NODE_ENV === 'production' && {
    cacheSizeBytes: 100 * 1024 * 1024, // 100MB cache
  })
});

module.exports = { db, auth, admin };