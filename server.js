require('dotenv').config();
const express = require('express');
const { db } = require('./config/firebase'); 
const session = require('express-session');
const FirestoreStore = require('firestore-store')(session); // 🔥 Cara import berbeda
const helmet = require('helmet');
const flash = require('connect-flash');

const app = express();
const port = process.env.PORT || 3000;

// === 1. CONFIG PROXY ===
app.set('trust proxy', 1); 

// === 2. MIDDLEWARE DASAR ===
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.use(express.static('public'));
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
        "connect-src": ["'self'", "https://generativelanguage.googleapis.com"],
      },
    },
  })
);

// === 4. SESSION MANAGEMENT (FIRESTORE) ===
const sessionSecret = process.env.SESSION_SECRET || 'rahasia_negara_bem_fallback_key';

app.use(session({
  store: new FirestoreStore({
    database: db, // 🔥 Instance Firestore dari firebase.js
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