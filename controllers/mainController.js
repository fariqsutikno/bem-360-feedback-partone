const { db, admin } = require('../config/firebase');

// --- DASHBOARD & LIST ---
const dashboard = async (req, res) => {
    try {
        const me = req.session.user;

        // 1. Ambil Data
        const [usersSnap, reviewsSnap, reflectionsSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('reviews').where('from_nim', '==', me.nim).get(),
            db.collection('reflections').doc(me.nim).get()
        ]);

        const allUsers = [];
        usersSnap.forEach(doc => allUsers.push(doc.data()));

        const myReviews = [];
        reviewsSnap.forEach(doc => myReviews.push(doc.data()));

        // 2. Filter: SIAPA MENILAI SIAPA (Logic Matrix)
        let targetUsers = [];

        if (me.role === 'anggota') {
            // Anggota nilai: Teman se-Dept + Menterinya + Semua BPH
            targetUsers = allUsers.filter(u => 
                (u.dept === me.dept && u.nim !== me.nim) || 
                (u.role === 'bph')
            );
        } 
        else if (me.role === 'menteri') {
            // Menteri nilai: Anak Buah + Semua BPH
            targetUsers = allUsers.filter(u => 
                (u.dept === me.dept && u.role === 'anggota') || 
                (u.role === 'bph')
            );
        } 
        else if (me.role === 'bph') {
            // BPH nilai: Semua Menteri + Sesama BPH
            targetUsers = allUsers.filter(u => 
                (u.role === 'menteri') || 
                (u.role === 'bph' && u.nim !== me.nim)
            );
        }

        // 3. Mapping Status (Done/Pending)
        let todoList = targetUsers.map(user => {
            const isDone = myReviews.some(r => r.to_nim === user.nim);
            return { ...user, status: isDone ? 'DONE' : 'PENDING' };
        });

        // === 🔥 LOGIC SORTING BIAR RAPI SESUAI CSV 🔥 ===
        
        // A. Urutan Jabatan (BPH Paling Atas)
        const roleRank = { 'bph': 1, 'menteri': 2, 'anggota': 3 };
        
        // B. Urutan Kementerian (Sesuai urutan CSV lo)
        const deptRank = {
            'inti': 1,      // BPH Inti
            'admin': 2,     // Admin
            'ppm': 3,       // PPM
            'penkeu': 4,    // Penkeu
            'inkeu': 5,     // Inkeu
            'dikrir': 6,    // Dikrir
            'kpsdm': 7,     // KPSDM
            'pemora': 8,    // Pemora
            'adkesma': 9,   // Adkesma
            'pengbas': 10,  // Pengbas
            'hubeks': 11,   // Hubeks
            'harkam': 12,   // Harkam
            'dkv': 13       // DKV
        };

        // C. DAFTAR URUTAN BPH
        // Pastikan tulisannya SAMA PERSIS sama yang di database
        const bphVipList = [
            'Sayyef',
            'Muhammad Fatih Ikhsan',
            'Fariq Bin Sutikno',
            'Haziq Jiratullah',
            'Ahmad Yazid Attamimi',
            'Ahmad Fauzan',
        ];

        todoList.sort((a, b) => {
            // A. Urutkan Departemen Dulu
            const deptA = deptRank[a.dept] || 99;
            const deptB = deptRank[b.dept] || 99;
            if (deptA !== deptB) return deptA - deptB;

            // B. Kalau sama-sama BPH, Pake Logic VIP
            if (a.role === 'bph' && b.role === 'bph') {
                let indexA = bphVipList.indexOf(a.name);
                let indexB = bphVipList.indexOf(b.name);

                // Kalau namanya gak ada di list (typo), taruh paling bawah (999)
                if (indexA === -1) indexA = 999;
                if (indexB === -1) indexB = 999;

                return indexA - indexB;
            }

            // C. Kalau bukan BPH, urutkan Jabatan (Menteri di atas Anggota)
            const roleRank = { 'menteri': 1, 'anggota': 2 };
            const roleA = roleRank[a.role] || 99;
            const roleB = roleRank[b.role] || 99;
            if (roleA !== roleB) return roleA - roleB;

            // D. Terakhir Abjad Nama
            return a.name.localeCompare(b.name);
        });

        // 4. Kirim ke View
        const isReflectionDone = reflectionsSnap.exists;
        res.render('dashboard', { me, todoList, isReflectionDone });

    } catch (error) {
        console.error(error);
        res.send("Error Dashboard");
    }
};

// --- PENILAIAN ORANG LAIN ---
const ratePage = async (req, res) => {
    const targetDoc = await db.collection('users').doc(req.params.target_nim).get();
    if (!targetDoc.exists) return res.redirect('/');
    res.render('form_rate', { me: req.session.user, target: targetDoc.data() });
};

const rateProcess = async (req, res) => {
    try {
        const me = req.session.user;
        const { 
            target_nim, review_type,
            // Peer Fields
            activity_status, recommendation, three_words, evidence,
            // Upward Fields
            clarity_rating, support_rating, comm_style, work_comfort, feedback_essay 
        } = req.body;

        const reviewId = `${me.nim}_to_${target_nim}`;
        
        let reviewData = {
            from_nim: me.nim,
            to_nim: target_nim,
            type: review_type,
            createdAt: new Date()
        };

        if (review_type === 'peer') {
            // DATA BUAT ANGGOTA
            reviewData.activity_status = activity_status || 'unknown';
            reviewData.recommendation = recommendation || 'evaluasi';
            reviewData.three_words = three_words || '-';
            reviewData.evidence = evidence || '-';
        } else {
            // DATA BUAT MENTERI
            reviewData.clarity_rating = parseInt(clarity_rating || 0);
            reviewData.support_rating = parseInt(support_rating || 0);
            reviewData.comm_style = comm_style || 'inkonsisten';
            reviewData.work_comfort = work_comfort || 'biasa';
            reviewData.feedback_essay = feedback_essay || '-';
        }

        await db.collection('reviews').doc(reviewId).set(reviewData);
        res.redirect('/');

    } catch (error) {
        console.error("Error Rating:", error);
        res.send("Gagal kirim rating.");
    }
};


// --- REFLEKSI DIRI (YANG TADINYA HILANG) ---
const reflectionPage = (req, res) => {
    res.render('form_reflection');
};

const reflectionProcess = async (req, res) => {
    try {
        const user = req.session.user;
        const { self_score, self_growth, obstacle } = req.body; // <-- Nangkep field baru

        await db.collection('reflections').doc(user.nim).set({
            nim: user.nim,
            name: user.name,
            self_score: parseInt(self_score),
            self_growth: self_growth, // <-- Simpan ini
            obstacle: obstacle,
            updatedAt: new Date()
        });

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.send("Gagal simpan refleksi.");
    }
};

// Export SEMUA fungsi
module.exports = { 
    dashboard, 
    ratePage, 
    rateProcess, 
    reflectionPage,     // <-- Pastikan ini ada
    reflectionProcess   // <-- Pastikan ini ada
};