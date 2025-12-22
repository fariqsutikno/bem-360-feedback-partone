const { db } = require('../config/firebase');
const { catatLog } = require('../utils/logs');

// 1. TAMPILKAN HALAMAN LOGIN
const loginPage = (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { error: null });
};

// 2. PROSES LOGIN (LOGIC UTAMA) - FIXED VERSION
const loginProcess = async (req, res) => {
    let nimInput = ""; 
    const userIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || "UNKNOWN";

    try {
        nimInput = req.body.nim ? req.body.nim.trim() : "";
        
        if (!nimInput) {
            throw new Error("NIM Kosong");
        }

        console.log(`[LOGIN ATTEMPT] Mencoba login dengan NIM: '${nimInput}' | IP: ${userIp}`);

        const userDoc = await db.collection('users').doc(nimInput).get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // 🔥 FIX: Set session dan tunggu sampai bener-bener tersimpan
            req.session.user = userData;
            
            console.log(`[LOGIN SUCCESS] User ditemukan: ${userData.name}`);

            await catatLog(
                nimInput, 
                "LOGIN_SUCCESS", 
                `Login via Web Dashboard (Role: ${userData.role || 'Member'})`, 
                userIp
            );
            
            // 🔥 CRITICAL FIX: Gunakan callback untuk memastikan session tersimpan
            req.session.save((err) => {
                if (err) {
                    console.error('[SESSION SAVE ERROR]', err);
                    return res.render('login', { error: 'Gagal menyimpan session. Coba lagi.' });
                }
                
                console.log('[SESSION SAVED] Session berhasil disimpan ke Firestore');
                console.log('[SESSION ID]', req.sessionID);
                console.log('[SESSION DATA]', req.session.user);
                
                // Redirect setelah session pasti tersimpan
                res.redirect('/');
            });

        } else {
            console.log(`[LOGIN FAILED] NIM '${nimInput}' tidak ada di database.`);
            await catatLog(
                nimInput, 
                "LOGIN_FAILED", 
                "NIM tidak terdaftar di database", 
                userIp
            );
            res.render('login', { error: 'NIM tidak terdaftar. Cek lagi ya!' });
        }

    } catch (error) {
        console.error('[SYSTEM ERROR]', error);
        await catatLog(
            nimInput || "SYSTEM", 
            "LOGIN_ERROR", 
            error.message, 
            userIp
        );
        res.render('login', { error: 'Terjadi kesalahan sistem. Coba lagi.' });
    }
};

// 3. LOGOUT
const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('[LOGOUT ERROR]', err);
        }
        res.redirect('/login');
    });
};

// 4. SEED DATA
const seedData = async (req, res) => {
    const users = [
        // ... (data user)
    ];
    const batch = db.batch();
    users.forEach(u => {
        const ref = db.collection('users').doc(u.nim);
        batch.set(ref, u);
    });
    await batch.commit();
    res.send('<h1>✅ Database berhasil diisi!</h1><a href="/login">Login</a>');
};

module.exports = { loginPage, loginProcess, logout, seedData };