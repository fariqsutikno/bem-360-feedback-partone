// config/firebase.js
const admin = require('firebase-admin');

// Titik dua (..) artinya "Mundur satu folder" buat nyari file json di luar folder config
const serviceAccount = require('../serviceAccountKey.json'); 

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

module.exports = { admin, db };