const express = require('express');
const router = express.Router();

// 1. IMPORT CONTROLLERS
const authController = require('../controllers/authController');
const mainController = require('../controllers/mainController');
const adminController = require('../controllers/adminController');
const aiController = require('../controllers/aiController');

// 2. IMPORT MIDDLEWARE (SATPAM)
// Pastikan nama di file middleware/authMiddleware.js adalah verifyUser & verifyAdmin
const { verifyUser, verifyAdmin } = require('../middleware/authMiddleware');

// ==============================================
// 🟢 ROUTE PUBLIK (Bisa diakses siapa aja)
// ==============================================
router.get('/login', authController.loginPage);
router.post('/login', authController.loginProcess);
router.get('/logout', authController.logout);
// router.get('/seed', authController.seedData); // Hapus nanti kalo udah production

// Admin Login (Pintu Gerbang Admin)
router.get('/admin', adminController.loginPage);
router.post('/admin/login', adminController.loginProcess);

// ==============================================
// 🔒 ROUTE ADMIN (Wajib Login Admin / verifyAdmin)
// ==============================================

// Dashboard Utama
router.get('/admin/dashboard', verifyAdmin, adminController.dashboard);

// Rapor Individu / Bedah Kasus (Tahap 2 & 5)
// PENTING: Ini harus diprotect biar gak diintip orang luar
router.get('/admin/report/:nim', verifyAdmin, adminController.userReport);

// API AI (Tahap 3 & 5)
// PENTING: Ini diprotect biar kuota AI gak dipake orang iseng
router.post('/api/generate-ai', verifyAdmin, aiController.generateInsight);
router.post('/api/analyze-person', verifyAdmin, aiController.analyzePerson);

// ==============================================
// 👤 ROUTE USER (Wajib Login User / verifyUser)
// ==============================================

// Dashboard Anggota
router.get('/', verifyUser, mainController.dashboard);

// Refleksi Diri
router.get('/reflection', verifyUser, mainController.reflectionPage);
router.post('/reflection', verifyUser, mainController.reflectionProcess);

// Menilai Teman/Atasan
router.get('/rate/:target_nim', verifyUser, mainController.ratePage);
router.post('/rate', verifyUser, mainController.rateProcess);

module.exports = router;