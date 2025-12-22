const admin = require('firebase-admin');
require('dotenv').config();

let serviceAccount;

try {
  // Coba load file JSON
  serviceAccount = require('../serviceAccountKey.json');
  console.log("✅ serviceAccountKey.json ditemukan.");
} catch (e) {
  console.error("❌ serviceAccountKey.json GAK KETEMU! Pastikan file ada di root folder.");
  // Kalau mau support env variable nanti, bisa tambah logic di sini
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

// Log buat mastiin db bukan undefined sebelum diexport
if (!db) console.error("⚠️ WARNING: Variable 'db' is undefined!");

module.exports = { admin, db };