require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const session = require('express-session');
const { FirestoreStore } = require('@google-cloud/connect-firestore');
const helmet = require('helmet');
const flash = require('connect-flash');

// 🔥 Inisialisasi Firebase yang Kompatibel dengan Vercel & Lokal
try {
  let serviceAccount;

  // Cek apakah env var untuk kredensial Vercel ada
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    // Parse dari environment variable (untuk Vercel/Produksi)
    serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    console.log("🔥 Initializing Firebase from environment variable...");
  } else {
    // Fallback ke file lokal (untuk Development)
    serviceAccount = require('./serviceAccountKey.json');
    console.log("🔥 Initializing Firebase from local service account file...");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Initialized successfully!");
  }
} catch (error) {
  console.error("❌ Critical error initializing Firebase:", error.message);
  // Di lingkungan produksi, Anda mungkin ingin menghentikan aplikasi jika Firebase gagal.
  // process.exit(1); 
}

const app = express();
const port = process.env.PORT || 3000;

// Percayai proksi di depan aplikasi, seperti yang digunakan Vercel
app.set('trust proxy', 1); 

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
        "script-src-attr": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https:"],
        "connect-src": ["'self'", "https://generativelanguage.googleapis.com"],
      },
    },
  })
);

const sessionSecret = process.env.SESSION_SECRET || 'rahasia_negara_bem_fallback_key';

// Konfigurasi session dengan Firestore Store
app.use(session({
  store: new FirestoreStore({
    dataset: admin.firestore(),
    kind: 'express-sessions',
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'bem.sid',
  cookie: { 
    // 🔥 FIX: Gunakan 'secure' cookie di produksi (wajib untuk SameSite=None/Lax)
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 jam
    sameSite: 'lax'
  },
  rolling: true
}));

// Middleware untuk debugging session (bisa dihapus di produksi)
app.use((req, res, next) => {
  console.log('=== SESSION DEBUG ===');
  console.log('Session ID:', req.sessionID);
  console.log('User:', req.session.user ? req.session.user.name : 'Not logged in');
  console.log('====================');
  next();
});

app.use(flash());

const routes = require('./routes/index');
app.use('/', routes);

app.listen(port, () => {
    console.log(`
===================================================`);
    console.log(`🚀 SERVER PORTAL BEM GEMA REVOLUSI SIAP TEMPUR!`);
    console.log(`===================================================`);
    console.log(`🏠 Alamat      : http://localhost:${port}`);
    console.log(`🌍 Mode        : ${process.env.NODE_ENV || 'Development'}`);
    console.log(`===================================================
`);
});
