const admin = require('firebase-admin');
require('dotenv').config();

let serviceAccount;

try {
  serviceAccount = require('../serviceAccountKey.json');
  console.log("✅ serviceAccountKey.json ditemukan.");
} catch (e) {
  console.error("❌ serviceAccountKey.json GAK KETEMU!");
}

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Initialized!");
  }
}

const db = admin.firestore();

module.exports = { admin, db };
