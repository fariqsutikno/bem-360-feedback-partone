require('dotenv').config(); // Muat environment variables
const express = require('express');
// 👇 PENTING: Cukup panggil db aja, inisialisasi biarin diurus file config
const { db, Firestore } = require('./config/firebase'); 
const { FirestoreStore } = require('@google-cloud/connect-firestore');
const session = require('express-session');
const FirestoreStore = require('connect-session-firestore')(session);
const helmet = require('helmet');
const flash = require('connect-flash');

const app = express();
const port = process.env.PORT || 3000;

// === 1. CONFIG PROXY (Wajib buat Nginx/HTTPS) ===
// Biar express percaya sama IP yang dikasih Nginx (buat fitur Logs IP lo)
app.set('trust proxy', 1); 

// === 2. MIDDLEWARE DASAR ===
// Biar bisa baca data dari FORM HTML (POST biasa)
app.use(express.urlencoded({ extended: true }));
// 🔥 BIAR BISA BACA DATA DARI JAVASCRIPT/FETCH (FITUR AI HRD BUTUH INI) 🔥
app.use(express.json()); 
// Folder Public (CSS/Gambar)
app.use(express.static('public'));
// View Engine
app.set('view engine', 'ejs');

// === 3. SECURITY (HELMET) ===
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
        "script-src-attr": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https:"],
        "connect-src": ["'self'", "https://generativelanguage.googleapis.com"], // Tambahan buat jaga-jaga API Google
      },
    },
  })
);

// === 4. SESSION MANAGEMENT (FIRESTORE) ===
// Validasi secret biar gak crash konyol
const sessionSecret = process.env.SESSION_SECRET || 'rahasia_negara_bem_fallback_key';

app.use(session({
  store: new FirestoreStore({
    database: db, // 🔥 Pakai 'database' bukan 'db'
    kind: 'express-sessions',
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production' ? true : false, 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// === 5. FLASH MESSAGES ===
app.use(flash());

// === 6. ROUTES ===
const routes = require('./routes/index');
app.use('/', routes);

// === 7. JALANKAN SERVER ===
app.listen(port, () => {
    console.log(`\n===================================================`);
    console.log(`🚀 SERVER PORTAL BEM GEMA REVOLUSI SIAP TEMPUR!`);
    console.log(`===================================================`);
    console.log(`🏠 Dashboard   : http://localhost:${port}`);
    console.log(`🔐 Login Admin : http://localhost:${port}/admin`);
    console.log(`🌍 Mode        : ${process.env.NODE_ENV || 'Development'}`);
    console.log(`===================================================\n`);
});
