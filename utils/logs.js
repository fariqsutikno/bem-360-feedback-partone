const catatLog = async (nim, action, details = "-", ip = "UNKNOWN") => {
    try {
        await db.collection('activity_logs').add({
            nim: nim || "UNKNOWN",
            action: action,
            details: details,
            timestamp: new Date(),
            ip_address: ip // <--- Disini kuncinya
        });
    } catch (e) {
        console.error("Log error:", e.message);
    }
};

module.exports = { catatLog };