require('dotenv').config(); // Muat environment variables
const express = require('express');
const { db } = require('./config/firebase');
const session = require('express-session');
const FirestoreStore = require('connect-session-firestore')(session);
const helmet = require('helmet');
const flash = require('connect-flash');
const admin = require('firebase-admin');

// Cek apakah lagi di Laptop (Local) atau di Server (Production)
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Kalau di RENDER, kita ambil dari Environment Variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    // Kalau di Laptop, ambil dari file
    serviceAccount = require('./serviceAccountKey.json');
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const app = express();
const port = process.env.PORT || 3000;

// === MIDDLEWARE WAJIB ===
// 1. Biar bisa baca data dari FORM HTML (POST biasa)
app.use(express.urlencoded({ extended: true }));

// 2. 🔥 BIAR BISA BACA DATA DARI JAVASCRIPT/FETCH (FITUR AI HRD BUTUH INI) 🔥
app.use(express.json()); 

// 3. Folder Public (CSS/Gambar)
app.use(express.static('public'));

// 4. Session & Flash
app.use(session({
    secret: 'rahasia_negara_bem',
    resave: false,
    saveUninitialized: true
}));
app.use(flash());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
        "script-src-attr": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https:"],
      },
    },
  })
);

app.set('trust proxy', 1); 

// Config Standard
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Validasi session secret
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is not set. Please create a .env file and add it.');
}

// Session
app.use(session({
    secret: process.env.SESSION_SECRET, // Gunakan secret dari .env
    resave: false,
    saveUninitialized: false,
    // proxy: true,
    // sameSite: 'lax',
    cookie: { 
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true, // Mencegah akses cookie dari JavaScript sisi klien
        secure: false,
    } 
}));
app.use(session({
  store: new FirestoreStore({
    dataset: db, // Pastiin variabel 'db' firestore lo kebaca di sini
    kind: 'sessions', // Nanti muncul collection baru 'sessions' di Firestore
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV == 'production' ? true : false, // Ubah jadi true kalau udah full HTTPS + Domain
    maxAge: 24 * 60 * 60 * 1000 // Session valid 1 hari (24 jam)
  }
}));

// Panggil Routes yang udah dipisah
const routes = require('./routes/index');
app.use('/', routes);

app.listen(port, () => {
    console.log(`\n===================================================`);
    console.log(`🚀 SERVER PORTAL BEM GEMA REVOLUSI SIAP TEMPUR!`);
    console.log(`===================================================`);
    console.log(`🏠 Dashboard Utama : http://localhost:${port}`);
    console.log(`🌱 Isi Data Awal   : http://localhost:${port}/seed`);
    console.log(`🔐 Login Admin     : http://localhost:${port}/admin`);
    console.log(`===================================================\n`);
});
