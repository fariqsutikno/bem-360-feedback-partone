const admin = require('firebase-admin');
require('dotenv').config();

let serviceAccount;

try {
  serviceAccount = require('../serviceAccountKey.json');
  console.log("✅ serviceAccountKey.json ditemukan.");
} catch (e) {
  console.error("❌ serviceAccountKey.json GAK KETEMU! Pastikan file ada di root folder.");
}

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Initialized!");
  } else {
    console.error("💀 Gagal Init Firebase: Credential Kosong/Salah Path.");
  }
}

const db = admin.firestore();

// 🔥 PENTING: Export juga admin.firestore (bukan instance db-nya)
// Karena connect-session-firestore butuh constructor, bukan instance
module.exports = { 
  admin, 
  db,
  Firestore: admin.firestore // Ini yang diperlukan connect-session-firestore
};