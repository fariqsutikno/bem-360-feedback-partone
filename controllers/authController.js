const { db } = require('../config/firebase');
const { catatLog } = require('../utils/logs');

// 1. TAMPILKAN HALAMAN LOGIN
const loginPage = (req, res) => {
    // Kalau udah login, jangan kasih akses ke halaman login lagi, langsung ke dashboard
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { error: null });
};

// 2. PROSES LOGIN (LOGIC UTAMA)
const loginProcess = async (req, res) => {
    // 1. Definisiin variabel di luar try-catch biar aman
    let nimInput = ""; 

    // 2. 🕵️‍♂️ LOGIC NANGKEP IP (Jurus 3 Lapis)
    // Urutannya: Cek req.ip (express) -> Cek header nginx -> Cek koneksi langsung
    const userIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || "UNKNOWN";

    try {
        // Ambil input dan Trim
        nimInput = req.body.nim ? req.body.nim.trim() : "";
        
        if (!nimInput) {
            throw new Error("NIM Kosong");
        }

        console.log(`[LOGIN ATTEMPT] Mencoba login dengan NIM: '${nimInput}' | IP: ${userIp}`);

        // Cek ke Database Firebase
        const userDoc = await db.collection('users').doc(nimInput).get();

        if (userDoc.exists) {
            const userData = userDoc.data();

            // === SUKSES ===
            // Simpan data user di Session
            req.session.user = userData;
            
            console.log(`[LOGIN SUCCESS] User ditemukan: ${userData.name}`);

            // 🔥 CATAT LOG SUKSES (Bawa IP) 🔥
            await catatLog(
                nimInput, 
                "LOGIN_SUCCESS", 
                `Login via Web Dashboard (Role: ${userData.role || 'Member'})`, 
                userIp // <--- IP Masuk Sini
            );
            
            // Simpan session & Redirect
            req.session.save(() => {
                res.redirect('/');
            });

        } else {
            // === GAGAL (USER TIDAK ADA) ===
            console.log(`[LOGIN FAILED] NIM '${nimInput}' tidak ada di database.`);

            // 🔥 CATAT LOG GAGAL (Bawa IP juga, biar tau siapa yg iseng) 🔥
            await catatLog(
                nimInput, 
                "LOGIN_FAILED", 
                "NIM tidak terdaftar di database", 
                userIp // <--- IP Masuk Sini
            );

            res.render('login', { error: 'NIM tidak terdaftar. Cek lagi ya!' });
        }

    } catch (error) {
        // === ERROR SISTEM ===
        console.error('[SYSTEM ERROR]', error);

        // 🔥 CATAT LOG ERROR (Bawa IP) 🔥
        await catatLog(
            nimInput || "SYSTEM", 
            "LOGIN_ERROR", 
            error.message, 
            userIp // <--- IP Masuk Sini
        );

        res.render('login', { error: 'Terjadi kesalahan sistem. Coba lagi.' });
    }
};

// 3. LOGOUT
const logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};

const seedData = async (req, res) => {
    const users = [
        // INTI
        { nim: '2023.38.2880', name: 'Sayyef', dept: 'inti', role: 'bph' },
        { nim: '2023.03.2616', name: 'Muhammad Fatih Ikhsan', dept: 'inti', role: 'bph' },
        { nim: '2023.03.2532', name: 'Fariq Bin Sutikno', dept: 'inti', role: 'bph' },
        { nim: '2024.03.3248', name: 'Haziq Jiratullah', dept: 'inti', role: 'bph' },
        { nim: '2023.03.2701', name: 'Ahmad Yazid Attamimi', dept: 'inti', role: 'bph' },
        { nim: '2024.03.3330', name: 'Ahmad Fauzan', dept: 'inti', role: 'bph' },
        
        // ADMIN
        { nim: '2023.38.2522', name: 'Haikal Abdullah', dept: 'admin', role: 'menteri' },
        { nim: '2024.03.3501', name: 'Muhammad Syafiq Aiman Suruury', dept: 'admin', role: 'anggota' },
        { nim: '2023.03.2778', name: 'Afisena Reyhan Hidayat', dept: 'admin', role: 'anggota' },
        
        // PPM
        { nim: '2023.03.2718', name: 'Muhammad Hafizh Irfandani', dept: 'ppm', role: 'menteri' },
        { nim: '2024.03.3357', name: 'Muhammad Taufik Darussalam', dept: 'ppm', role: 'anggota' },
        { nim: '2024.38.3257', name: 'Ahmad Muhammad Al Manar Haq', dept: 'ppm', role: 'anggota' },
        { nim: '2024.38.3259', name: 'Firhan Thoriq Hibatullah', dept: 'ppm', role: 'anggota' },
        { nim: '2024.03.3250', name: 'Affan', dept: 'ppm', role: 'anggota' },
        { nim: '2025.38.4931', name: 'Muhammad Umar Shiddiq Al Irfani', dept: 'ppm', role: 'anggota' },
        
        // PENKEU
        { nim: '2023.03.2579', name: 'Wahyu Dwi Suntoro', dept: 'penkeu', role: 'menteri' },
        { nim: '2023.03.2683', name: 'Afwan Izzadien Idharulhaq', dept: 'penkeu', role: 'anggota' },
        { nim: '2024.03.3170', name: 'Sultan Gaza Al Fatah', dept: 'penkeu', role: 'anggota' },
        
        // INKEU
        { nim: '2023.03.2668', name: 'Muhammad Luthfi Hakim', dept: 'inkeu', role: 'menteri' },
        { nim: '2023.38.2775', name: 'Satria Lingga Alfikri', dept: 'inkeu', role: 'anggota' },
        { nim: '2024.03.3321', name: 'Zaki Waliyurrahman', dept: 'inkeu', role: 'anggota' },
        { nim: '2025.33.4313', name: 'Muhammad Syafiq Pangaribowo', dept: 'inkeu', role: 'anggota' },
        
        // DIKRIR
        { nim: '2023.38.2915', name: 'M. Afif Zufar Adz-Dzaki', dept: 'dikrir', role: 'menteri' },
        { nim: '2023.38.2927', name: 'Satria Putera Khoir', dept: 'dikrir', role: 'anggota' },
        { nim: '2023.38.2987', name: 'Fadlan Ramadhan Maulana', dept: 'dikrir', role: 'anggota' },
        { nim: '2024.03.3348', name: 'Khalid', dept: 'dikrir', role: 'anggota' },
        { nim: '2024.03.3462', name: 'Muhammad Rizqi', dept: 'dikrir', role: 'anggota' },
        { nim: '2025.03.3940', name: 'Gunawan Abdussalam', dept: 'dikrir', role: 'anggota' },
        { nim: '2025.38.4238', name: 'Zaim Fikri Alhamidi', dept: 'dikrir', role: 'anggota' },
        
        // KPSDM
        { nim: '2023.38.2741', name: 'Gazzeta Raka Putra Setyawan', dept: 'kpsdm', role: 'menteri' },
        { nim: '2022.03.2386', name: 'Hasan Abi Abdillah', dept: 'kpsdm', role: 'anggota' },
        { nim: '2024.03.3446', name: 'Bhekti Nugroho Sudyatmoko', dept: 'kpsdm', role: 'anggota' },
        { nim: '2024.03.3123', name: 'Ismail H. Laniang', dept: 'kpsdm', role: 'anggota' },
        { nim: '2025.33.4425', name: 'Ahmad Nadhil Milzam', dept: 'kpsdm', role: 'anggota' },
        { nim: '2025.38.3957', name: 'Roshan Kalevi', dept: 'kpsdm', role: 'anggota' },
        
        // PEMORA
        { nim: '2024.03.3613', name: 'Muhammad Jundi Fakhrudin Ismail', dept: 'pemora', role: 'menteri' },
        { nim: '2024.03.3111', name: 'Endriyanto Utomo', dept: 'pemora', role: 'anggota' },
        { nim: '2024.03.3231', name: 'Abdul Karim', dept: 'pemora', role: 'anggota' },
        { nim: '2024.03.3449', name: 'Abdullah Zainu', dept: 'pemora', role: 'anggota' },
        { nim: '2024.38.3542', name: 'Garry Prihantono', dept: 'pemora', role: 'anggota' },
        { nim: '2025.03.3903', name: 'Muhammad Fadhil \'Alim', dept: 'pemora', role: 'anggota' },
        { nim: '2025.03.4054', name: 'Exshel Sultan Amirudin', dept: 'pemora', role: 'anggota' },
        
        // ADKESMA
        { nim: '2023.03.2752', name: 'Muadib Hasan Asror', dept: 'adkesma', role: 'menteri' },
        { nim: '2023.03.2549', name: 'Osama Syaifudin Kamal', dept: 'adkesma', role: 'anggota' },
        { nim: '2023.03.3031', name: 'Muhammad Didit Dermawan', dept: 'adkesma', role: 'anggota' },
        { nim: '2023.03.2650', name: 'Abdulloh', dept: 'adkesma', role: 'anggota' },
        { nim: '2025.03.4110', name: 'Putra Pandega Halu', dept: 'adkesma', role: 'anggota' },
        
        // PENGBAS
        { nim: '2023.03.2807', name: 'Harish Faqihuddin Assahmi', dept: 'pengbas', role: 'menteri' },
        { nim: '2023.38.2657', name: 'Ahmad Faqih Ramadhani', dept: 'pengbas', role: 'anggota' },
        { nim: '2024.03.3308', name: 'Jeffrey Wahyu Abadi', dept: 'pengbas', role: 'anggota' },
        { nim: '2025.03.3824', name: 'Ahmad Haidar Amanullah', dept: 'pengbas', role: 'anggota' },
        
        // HUBEKS
        { nim: '2023.38.2692', name: 'Muhammad Rafif Abdul Aziz', dept: 'hubeks', role: 'menteri' },
        { nim: '2023.03.3015', name: 'Muhammad Faisal Nur', dept: 'hubeks', role: 'anggota' },
        { nim: '2024.03.3382', name: 'Muadz Nizar Jabal', dept: 'hubeks', role: 'anggota' },
        { nim: '2025.03.4169', name: 'Muhammad Zaid Shabiq', dept: 'hubeks', role: 'anggota' },
        { nim: '2025.03.4278', name: 'Muhammad Zaidan Athalla', dept: 'hubeks', role: 'anggota' },
        { nim: '2025.38.4446', name: 'Abdullah Umeir', dept: 'hubeks', role: 'anggota' },
        
        // HARKAM
        { nim: '2023.38.2585', name: 'Zaid', dept: 'harkam', role: 'menteri' },
        { nim: '2023.38.2674', name: 'Ghufron Nur Halim', dept: 'harkam', role: 'anggota' },
        { nim: '2024.03.3603', name: 'Rohmat Subekti', dept: 'harkam', role: 'anggota' },
        { nim: '2025.03.3767', name: 'Muhammad Farhan Wildan', dept: 'harkam', role: 'anggota' },
        { nim: '2025.38.4317', name: 'Haidar', dept: 'harkam', role: 'anggota' },
        
        // DKV
        { nim: '2023.03.2523', name: 'Muhammad Latif Hidayat', dept: 'dkv', role: 'menteri' },
        { nim: '2025.03.4173', name: 'Rizqi Yoda Putra', dept: 'dkv', role: 'anggota' },
        { nim: '2025.03.4345', name: 'Muhammad Havidhani Al Ghifari', dept: 'dkv', role: 'anggota' },
        { nim: '2025.33.3818', name: 'Erwan Darmawan', dept: 'dkv', role: 'anggota' },
        { nim: '2025.38.3773', name: 'Alieffio Runako Edwar', dept: 'dkv', role: 'anggota' },
        { nim: '2023.03.2573', name: 'Isa Habiburrahman', dept: 'dkv', role: 'anggota' },
        
    ];

    const batch = db.batch();

    // Looping data dan masukin ke database
    users.forEach(u => {
        const ref = db.collection('users').doc(u.nim);
        batch.set(ref, u);
    });

    await batch.commit();

    res.send('<h1>✅ Database Kabinet Gema Revolusi Berhasil Diisi!</h1><p>68 Anggota sudah terdaftar.</p><a href="/login">Login Sekarang</a>');
};

module.exports = { loginPage, loginProcess, logout, seedData };