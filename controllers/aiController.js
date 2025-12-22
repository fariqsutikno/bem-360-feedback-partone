const { GoogleGenerativeAI } = require("@google/generative-ai");
const { db } = require('../config/firebase');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateInsight = async (req, res) => {
    try {
        // 1. CEK CACHE DATABASE (Biar Hemat Token & Waktu)
        const metaDoc = await db.collection('meta').doc('ai_report').get();
        const now = new Date();
        
        if (metaDoc.exists) {
            const data = metaDoc.data();
            const lastUpdate = data.updatedAt.toDate();
            const diffHours = Math.abs(now - lastUpdate) / 36e5;

            // Kalau data masih "segar" (kurang dari 6 jam), pake yang lama aja
            if (diffHours < 6) {
                console.log("⚡ Pakai Cache AI Report");
                return res.json({ success: true, data: data.result, isCached: true });
            }
        }

        console.log("🤖 Generating New AI Report...");

        // 2. KUMPULIN DATA MENTAH
        const [usersSnap, reviewsSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('reviews').get()
        ]);

        let summary = {
            total_users: usersSnap.size,
            dept_stats: {},
            top_issues: []
        };

        const users = [];
        usersSnap.forEach(d => users.push(d.data()));
        const reviews = [];
        reviewsSnap.forEach(d => reviews.push(d.data()));

        // PRE-PROCESSING DATA
        users.forEach(u => {
            const myReviews = reviews.filter(r => r.to_nim === u.nim);
            if(myReviews.length === 0) return;

            // Cek Dept Risk
            if (!summary.dept_stats[u.dept]) summary.dept_stats[u.dept] = { leave: 0, toxic: 0, voters: 0 };
            summary.dept_stats[u.dept].voters += myReviews.length;
            summary.dept_stats[u.dept].leave += myReviews.filter(r => r.retention_impact === 'leave').length;
            summary.dept_stats[u.dept].toxic += myReviews.filter(r => r.comm_style === 'otoriter').length;

            // Cek Individu Bermasalah
            if (u.role === 'menteri') {
                const leaveCount = myReviews.filter(r => r.retention_impact === 'leave').length;
                if (leaveCount > 1) {
                    summary.top_issues.push(`${u.name} (${u.dept}): ${leaveCount} staff mau resign.`);
                }
            }
        });

        // 3. RAKIT PROMPT BUAT GEMINI (FIXED: PAKE BACKSLASH)
        const prompt = `
        Berperanlah sebagai Konsultan SDM Senior untuk BEM Mahasiswa. Analisis data ringkasan berikut:
        ${JSON.stringify(summary)}

        Tugasmu memberikan insight dalam format JSON (TANPA MARKDOWN, HANYA RAW JSON, GUNAKAN HTML UNTUK FORMATTING) dengan 3 key:
        1. "bem_insight": (String) Analisis helikopter view kondisi kabinet secara umum. Tone: Profesional tapi tegas.
        2. "dept_insight": (String) Departemen mana yang paling kritis (High Turnover/Toxic) dan solusinya.
        3. "individual_insight": (String) Highlight anomali individu (Tanpa menyebut nama lengkap, inisial saja) dan rekomendasi tindakannya.

        Bahasa: Indonesia Santai (Professional Casual). Maksimal 2-3 kalimat per poin.
        `;

        // 4. TEMBAK KE GEMINI
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // Bersihin markdown json kalau ada
        let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        let jsonResult;
        
        try {
            jsonResult = JSON.parse(text);
        } catch (e) {
            console.error("Gagal parse JSON dari AI:", text);
            // Fallback kalau AI ngaco formatnya
            jsonResult = {
                bem_insight: "AI lagi pusing format data, coba lagi nanti.",
                dept_insight: "-",
                individual_insight: "-"
            };
        }

        // 5. SIMPAN KE DATABASE (Cache)
        await db.collection('meta').doc('ai_report').set({
            result: jsonResult,
            updatedAt: now
        });

        res.json({ success: true, data: jsonResult, isCached: false });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ success: false, message: "AI lagi pusing wak, coba nanti." });
    }
};

const analyzePerson = async (req, res) => {
    try {
        const { targetNim } = req.body; 

        // 1. Ambil Data User & Review
        const userDoc = await db.collection('users').doc(targetNim).get();
        const user = userDoc.data();

        const reviewsSnap = await db.collection('reviews').where('to_nim', '==', targetNim).get();
        let feedbacks = [];
        
        // Gabungin semua jenis teks feedback (Evidence, Essay, 3 Kata)
        reviewsSnap.forEach(doc => {
            const d = doc.data();
            if (d.evidence && d.evidence !== '-') feedbacks.push(`(Bukti): ${d.evidence}`);
            if (d.feedback_essay && d.feedback_essay !== '-') feedbacks.push(`(Feedback): ${d.feedback_essay}`);
            if (d.three_words && d.three_words !== '-') feedbacks.push(`(Sifat): ${d.three_words}`);
            // Backup kompatibilitas data lama
            if (d.notes && d.notes.trim().length > 3) feedbacks.push(d.notes);
        });

        // Kalau sepi, skip
        if (feedbacks.length === 0) {
            return res.json({ 
                success: false, 
                message: "Belum ada feedback tertulis buat dianalisis." 
            });
        }

        // 2. RAKIT PROMPT SAKTI (Versi Final Lo)
        const prompt = `
        Role: Kamu adalah HRD Analyst senior yang objektif, tajam, dan to-the-point.
        Context: Berikut adalah ${feedbacks.length} masukan anonim dari anggota BEM untuk ${user.name} (Jabatan: ${user.role}).
        
        Data Masukan:
        ${JSON.stringify(feedbacks)}

        Task:
        Analisis data di atas dan berikan output format JSON (RAW JSON only, tanpa backticks) dengan key berikut:
        1. "sentiment": (String) Sentimen dominan (Positif/Negatif/Netral) dan alasannya singkat.
        2. "top_complaints": (Array of Strings) 3 poin keluhan/apresiasi utama yang paling sering muncul.
        3. "toxic_score": (Integer) Skala 0-100 seberapa toxic orang ini? (0 = Mantap Jiwa, 100 = Sangat Toxic).
        4. "is_toxic": (Boolean) True jika toxic_score > 60.
        5. "advice": (String) Saran singkat menohok (1-2 kalimat) langsung ke orangnya (gunakan kata "Anda").

        Aturan Formatting:
        - JANGAN gunakan Markdown (bintang ** atau *).
        - Gunakan HTML tag <b>untuk tebal</b> dan <i>untuk miring</i> jika perlu penekanan.
        - Gunakan Bahasa Indonesia yang profesional tapi lugas ala HRD.
        `;

        // 3. TEMBAK GEMINI (Pake model sejuta umat biar aman)
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // Bersihin sisa-sisa markdown json kalau AI bandel
        let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResult = JSON.parse(text);

        res.json({ success: true, data: jsonResult });

    } catch (error) {
        console.error("AI HRD Error:", error);
        res.status(500).json({ success: false, message: "AI lagi pusing baca curhatan." });
    }
};

module.exports = { generateInsight, analyzePerson };