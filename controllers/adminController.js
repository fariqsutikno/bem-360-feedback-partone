const { db } = require('../config/firebase');

// 1. HALAMAN LOGIN
const loginPage = (req, res) => {
    if (req.session.isAdmin) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin_login', { error: null });
};

// 2. PROSES LOGIN
const loginProcess = (req, res) => {
    const { password } = req.body;
    const ADMIN_PASS = 'bphganteng'; 

    if (password === ADMIN_PASS) {
        req.session.isAdmin = true; 
        res.redirect('/admin/dashboard');
    } else {
        res.render('admin_login', { error: 'Password Salah! Hayo mau ngapain?' });
    }
};

// 3. DASHBOARD ADMIN (COCKPIT MODE - FIXED)
const dashboard = async (req, res) => {
    try {
        // A. AMBIL SEMUA DATA
        const [usersSnap, reviewsSnap, reflectionsSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('reviews').get(),
            db.collection('reflections').get()
        ]);

        const users = [];
        usersSnap.forEach(doc => users.push(doc.data()));

        const reviews = [];
        reviewsSnap.forEach(doc => reviews.push(doc.data()));

        const reflections = [];
        reflectionsSnap.forEach(doc => reflections.push(doc.data()));

        // B. VARIABEL GLOBAL STATS (Untuk Card Atas)
        let globalStats = {
            totalUsers: users.length,
            sudahRefleksi: 0,
            mvpUser: { name: 'Belum Ada Data', count: 0 },
            ghostUser: { name: 'Belum Ada Data', count: 0 },
            crisisDept: { name: 'Aman Terkendali', riskScore: 0 }
        };

        let deptRiskMap = {}; // Helper hitung resiko per dept

        // C. OLAH DATA REPORT
        let report = users.map(user => {
            // Cek Refleksi
            const myRefl = reflections.find(r => r.nim === user.nim);
            if (myRefl) globalStats.sudahRefleksi++;

            // Filter Review Valid (Skip No Interaction)
            const reviewsToMe = reviews.filter(r => 
                r.to_nim === user.nim && 
                r.activity_status !== 'no_interaction' && 
                r.comm_style !== 'no_interaction'
            );

            let stats = {
                nim: user.nim,
                name: user.name,
                dept: user.dept,
                role: user.role,
                self_score: myRefl ? myRefl.self_score : 0,
                has_reflection: !!myRefl,
                votes_given: reviews.filter(r => r.from_nim === user.nim).length,
                total_voters: reviewsToMe.length,
                driver_count: 0,
                ghost_count: 0,
                avg_peer_score: 0,
                tags: []
            };

            if (stats.total_voters > 0) {
                // LOGIC ANGGOTA
                if (user.role === 'anggota') {
                    let totalPoin = 0;
                    reviewsToMe.forEach(r => {
                        if (r.activity_status === 'driver') {
                            stats.driver_count++;
                            totalPoin += 10;
                        } else if (r.activity_status === 'passenger') totalPoin += 5;
                        else if (r.activity_status === 'ghost') stats.ghost_count++;
                    });
                    stats.avg_peer_score = (totalPoin / stats.total_voters).toFixed(1);

                    // UPDATE CARD MVP & GHOST
                    if (stats.driver_count > globalStats.mvpUser.count) {
                        globalStats.mvpUser = { name: user.name, count: stats.driver_count };
                    }
                    if (stats.ghost_count > globalStats.ghostUser.count) {
                        globalStats.ghostUser = { name: user.name, count: stats.ghost_count };
                    }

                    // TAGS
                    const gap = stats.self_score - stats.avg_peer_score;
                    if (stats.self_score > 0) {
                        if (gap >= 3) stats.tags.push("DELUSIONAL 🤡");
                        else if (gap <= -3) stats.tags.push("IMPOSTER 🥺");
                    }
                    if (stats.ghost_count > (stats.total_voters / 2)) stats.tags.push("GHOST 👻");
                    if (stats.avg_peer_score >= 8.5) stats.tags.push("MVP ⭐");
                } 
                // LOGIC MENTERI
                else {
                    const leaveVotes = reviewsToMe.filter(r => r.retention_impact === 'leave').length;
                    const retentionRisk = (leaveVotes / stats.total_voters) * 100;
                    const toxicVotes = reviewsToMe.filter(r => r.comm_style === 'otoriter' || r.comm_style === 'bingung').length;

                    // Hitung Resiko Dept
                    if (!deptRiskMap[user.dept]) deptRiskMap[user.dept] = 0;
                    if (retentionRisk > 0) deptRiskMap[user.dept] += retentionRisk;

                    if (retentionRisk > 30) stats.tags.push("HIGH TURNOVER 🚨");
                    if (toxicVotes > 1) stats.tags.push("COMM. ISSUE 🚩");
                    if (retentionRisk === 0 && toxicVotes === 0) stats.tags.push("GOOD LEADER 🛡️");
                }
            } else {
                stats.tags.push("NO DATA 💤");
            }

            return stats;
        });

        // D. FINALISASI CARD CRISIS DEPT
        let maxRisk = 0;
        for (const [dept, risk] of Object.entries(deptRiskMap)) {
            // Kita cari dept dengan skor resiko tertinggi
            if (risk > maxRisk) {
                maxRisk = risk;
                globalStats.crisisDept = { name: dept.toUpperCase(), riskScore: risk };
            }
        }

        // E. SORTING (BPH VIP + URUTAN DEPT)
        const deptRank = {
            'inti': 1, 'admin': 2, 'ppm': 3, 'penkeu': 4, 'inkeu': 5, 
            'dikrir': 6, 'kpsdm': 7, 'pemora': 8, 'adkesma': 9, 
            'pengbas': 10, 'hubeks': 11, 'harkam': 12, 'dkv': 13
        };
        const bphVipList = [
            'Sayyef', 'Muhammad Fatih Ikhsan', 'Fariq Bin Sutikno', 
            'Haziq Jiratullah', 'Ahmad Yazid Attamimi', 'Ahmad Fauzan', 'Habil Qowwim Azroqi'
        ];

        report.sort((a, b) => {
            const deptA = deptRank[a.dept] || 99;
            const deptB = deptRank[b.dept] || 99;
            if (deptA !== deptB) return deptA - deptB;

            if (a.role === 'bph' && b.role === 'bph') {
                let indexA = bphVipList.indexOf(a.name);
                let indexB = bphVipList.indexOf(b.name);
                if (indexA === -1) indexA = 999;
                if (indexB === -1) indexB = 999;
                return indexA - indexB;
            }

            const roleRank = { 'menteri': 1, 'anggota': 2 };
            const roleA = roleRank[a.role] || 99;
            const roleB = roleRank[b.role] || 99;
            if (roleA !== roleB) return roleA - roleB;

            return a.name.localeCompare(b.name);
        });

        res.render('admin_dashboard', { report, globalStats });

    } catch (error) {
        console.error("Error Admin Dashboard:", error);
        res.send("Error Wak, cek console.");
    }
};

// ... (Bagian atas controller biarin aja) ...

// 4. RAPOR INDIVIDU (LOGIC BEDAH KASUS)
// controllers/adminController.js

const userReport = async (req, res) => {
    try {
        const targetNim = req.params.nim;

        // 1. AMBIL DATA USER & REFLEKSI
        const userDoc = await db.collection('users').doc(targetNim).get();
        if (!userDoc.exists) return res.send("User gak ketemu.");
        const user = userDoc.data();

        const reflDoc = await db.collection('reflections').doc(targetNim).get();
        const reflection = reflDoc.exists ? reflDoc.data() : null;

        // 2. AMBIL REVIEW
        const reviewsSnap = await db.collection('reviews').where('to_nim', '==', targetNim).get();
        let reviews = [];
        reviewsSnap.forEach(d => reviews.push(d.data()));

        // 3. INIT STATISTIK (WADAH DATA)
        let stats = {
            totalVoters: reviews.length,
            
            // --- PEER STATS (ANGGOTA) ---
            aktif_tinggi: 0, cukup_aktif: 0, pasif: 0, unknown: 0,
            rekomendasi: { promosi:0, evaluasi:0, rotasi:0, reshuffle:0 },
            words_list: [],     // Nampung 3 kata
            evidence_list: [],  // Nampung bukti
            peerScoreTotal: 0,
            avgPeerScore: 0,

            // --- UPWARD STATS (MENTERI) ---
            stars_clarity: 0, stars_support: 0,
            avgClarity: 0, avgSupport: 0,
            comm: { jernih:0, inkonsisten:0, slow:0, otoriter:0 },
            comfort: { ya:0, biasa:0, tidak:0 },
            feedback_list: [],

            // --- GENERAL (GAP & DECISION) ---
            selfScore: reflection ? parseInt(reflection.self_score) : 0,
            gap: 0, 
            gapLabel: "Menunggu Data", 
            decisionSupport: "Belum cukup data."
        };

        // 4. LOOPING DATA (ITUNG-ITUNGAN)
        reviews.forEach(r => {
            if (r.type === 'peer') {
                // === LOGIC ANGGOTA BARU ===
                // Skor: Aktif Tinggi=10, Cukup=7, Pasif=0
                if (r.activity_status === 'aktif_tinggi') { stats.aktif_tinggi++; stats.peerScoreTotal += 10; }
                else if (r.activity_status === 'cukup_aktif') { stats.cukup_aktif++; stats.peerScoreTotal += 7; }
                else if (r.activity_status === 'pasif') { stats.pasif++; stats.peerScoreTotal += 0; }
                else { stats.unknown++; } 

                // Hitung Rekomendasi (Promosi/Reshuffle)
                if (r.recommendation && stats.rekomendasi[r.recommendation] !== undefined) {
                    stats.rekomendasi[r.recommendation]++;
                }

                // Kumpulin Text
                if (r.three_words) stats.words_list.push(r.three_words);
                if (r.evidence) stats.evidence_list.push(r.evidence);

            } else {
                // === LOGIC MENTERI BARU ===
                stats.stars_clarity += (r.clarity_rating || 0);
                stats.stars_support += (r.support_rating || 0);
                
                if (r.comm_style) stats.comm[r.comm_style]++;
                if (r.work_comfort) stats.comfort[r.work_comfort]++;
                if (r.feedback_essay) stats.feedback_list.push(r.feedback_essay);
            }
        });

        // 5. FINALISASI ANGKA & KESIMPULAN
        if (stats.totalVoters > 0) {
            
            if (user.role === 'anggota') {
                // A. HITUNG RATA-RATA PEER
                // Kita cuma hitung pembagi dari orang yang beneran nilai (bukan 'unknown')
                const validVoters = stats.aktif_tinggi + stats.cukup_aktif + stats.pasif;
                stats.avgPeerScore = validVoters > 0 ? (stats.peerScoreTotal / validVoters).toFixed(1) : 0;
                
                // B. GAP ANALYSIS (LOGIKA LAMA DIKEMBALIKAN DISINI)
                if (stats.selfScore > 0) {
                    stats.gap = (stats.selfScore - stats.avgPeerScore).toFixed(1);
                    
                    if (stats.gap >= 2.5) stats.gapLabel = "⚠️ OVERCONFIDENT (Delusional)";
                    else if (stats.gap <= -2.5) stats.gapLabel = "🛡️ IMPOSTER (Kurang PD)";
                    else stats.gapLabel = "✅ REALISTIC (Valid)";
                }

                // C. DECISION SUPPORT (LOGIKA BARU - RESHUFFLE/PROMOSI)
                if (stats.rekomendasi.reshuffle > 0) {
                    stats.decisionSupport = `🚨 BAHAYA: Ada ${stats.rekomendasi.reshuffle} rekomendasi RESHUFFLE. Cek 'Evidence' segera!`;
                } else if (stats.rekomendasi.promosi >= (validVoters / 2)) {
                    stats.decisionSupport = "⭐ TOP TALENT: Mayoritas merekomendasikan Promosi. Siapkan jenjang karir.";
                } else if (stats.pasif > stats.cukup_aktif) {
                    stats.decisionSupport = "👻 GHOST ALERT: Terindikasi pasif/hilang-hilangan. Panggil personal.";
                } else {
                    stats.decisionSupport = "✅ AMAN: Kinerja sesuai standar.";
                }

            } else {
                // D. HITUNG MENTERI (BINTANG)
                stats.avgClarity = (stats.stars_clarity / stats.totalVoters).toFixed(1);
                stats.avgSupport = (stats.stars_support / stats.totalVoters).toFixed(1);

                // E. DECISION SUPPORT MENTERI
                if (stats.comfort.tidak > 0) {
                    stats.decisionSupport = `🚨 KRISIS: ${stats.comfort.tidak} Staff merasa TIDAK NYAMAN & ingin keluar. Segera evaluasi gaya leadership!`;
                } else if (stats.comm.otoriter > 0) {
                    stats.decisionSupport = "⚠️ WARNING: Terindikasi gaya komunikasi Otoriter. Perlu pendekatan persuasif.";
                } else if (stats.comm.inkonsisten > stats.comm.jernih) {
                    stats.decisionSupport = "⚠️ ARAHAN BINGUNG: Staff menilai arahan sering berubah-ubah (Inkonsisten).";
                } else {
                    stats.decisionSupport = "🛡️ SOLID LEADER: Kepemimpinan berjalan baik & staff betah.";
                }
            }
        }

        // 6. RENDER
        res.render('admin_report', { user, reflection, stats });

    } catch (e) {
        console.error("Error Report:", e);
        res.send("Gagal memuat laporan.");
    }
};

module.exports = { loginPage, loginProcess, dashboard, userReport };
