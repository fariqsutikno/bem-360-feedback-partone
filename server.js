require('dotenv').config(); // Muat environment variables
const express = require('express');
// 👇 PENTING: Cukup panggil db aja, inisialisasi biarin diurus file config
const { db } = require('./config/firebase'); 
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
    dataset: db, // Pake variabel 'db' yang diimport dari config/firebase
    kind: 'sessions', // Nanti muncul collection 'sessions' di Firestore
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false, // Hemat storage, cuma simpen kalau user login
  cookie: { 
    // Secure: true kalau di Production (HTTPS), false kalau di Local
    // Karena lo pake Nginx HTTPS, idealnya ini true. 
    // Tapi kalau masih error login, ubah sementara jadi false.
    secure: process.env.NODE_ENV === 'production' ? true : false, 
    httpOnly: true, // Anti XSS
    maxAge: 24 * 60 * 60 * 1000, // 1 Hari
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
