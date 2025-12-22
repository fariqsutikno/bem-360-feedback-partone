require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const session = require('express-session');
// 🔥 FIX: Gunakan library resmi Google
const { FirestoreStore } = require('@google-cloud/connect-firestore');
const helmet = require('helmet');
const flash = require('connect-flash');

// 🔥 Inisialisasi Firebase
if (!admin.apps.length) {
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Initialized!");
  } catch (e) {
    console.error("❌ Error initializing Firebase:", e);
  }
}

const app = express();
const port = process.env.PORT || 3000;

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

// 🔥 FIX: Konfigurasi session dengan Firestore Store resmi
app.use(session({
  store: new FirestoreStore({
    dataset: admin.firestore(), // ← Ini cara yang benar
    kind: 'express-sessions',    // Nama collection di Firestore
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'bem.sid',
  cookie: { 
    secure: false, // Set false untuk development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 jam
    sameSite: 'lax'
  },
  rolling: true
}));

// 🔥 DEBUGGING MIDDLEWARE (Optional - hapus di production)
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
    console.log(`\n===================================================`);
    console.log(`🚀 SERVER PORTAL BEM GEMA REVOLUSI SIAP TEMPUR!`);
    console.log(`===================================================`);
    console.log(`🏠 Dashboard   : http://localhost:${port}`);
    console.log(`🔐 Login Admin : http://localhost:${port}/admin`);
    console.log(`🌍 Mode        : ${process.env.NODE_ENV || 'Development'}`);
    console.log(`===================================================\n`);
});
