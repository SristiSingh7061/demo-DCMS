const path = require("path");
const express = require("express");
const router = express.Router();
const db = require("./db");

function ensureLoggedIn(req, res, next) {
    if (req.session.user) return next();
    return res.status(401).json({ success: false, error: "Please login first." });
}

// Helper: log an action into action_history
function logAction(complaintId, action, doneBy, deptName, note) {
    const sql = `INSERT INTO action_history (complaint_id, action, done_by, dept_name, note) VALUES (?,?,?,?,?)`;
    db.query(sql, [complaintId, action, doneBy, deptName, note], (err) => {
        if (err) console.error("Action history log failed:", err.message);
    });
}

// ── GET ALL DEPARTMENTS (for dropdown) ────────────────────────────────────────
router.get("/api/departments", ensureLoggedIn, (req, res) => {
    db.query("SELECT * FROM departments WHERE status = 'active' ORDER BY name", (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "DB error." });
        return res.json({ success: true, departments: results });
    });
});

// ── GET USERS BY DEPARTMENT (for concerned person dropdown) ──────────────────
router.get("/api/users/by-dept/:deptId", ensureLoggedIn, (req, res) => {
    const sql = "SELECT id, fullname, emp_code FROM users WHERE dept_id = ? AND role = 'user'";
    db.query(sql, [req.params.deptId], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "DB error." });
        return res.json({ success: true, users: results });
    });
});

// ── FILE NEW COMPLAINT ────────────────────────────────────────────────────────
router.post("/api/complaints", ensureLoggedIn, (req, res) => {
    const { title, category, description, target_dept, assigned_to } = req.body;
    const user = req.session.user;

    if (!title || !category || !description || !target_dept) {
        return res.status(400).json({ success: false, error: "Please fill all required fields." });
    }

    const complaintId = "CMP" + Date.now().toString().slice(-8);

    const sql = `INSERT INTO complaints
        (complaint_id, title, category, description, status, target_dept, assigned_to, filed_by)
        VALUES (?,?,?,?,'Pending',?,?,?)`;

    db.query(sql, [complaintId, title, category, description, target_dept, assigned_to || null, user.id],
        (err, result) => {
            if (err) {
                console.error("Complaint insert error:", err);
                return res.status(500).json({ success: false, error: "Failed to file complaint." });
            }

            // Get target dept name for history log
            db.query("SELECT name FROM departments WHERE id=?", [target_dept], (err2, depts) => {
                const deptName = depts && depts[0] ? depts[0].name : "Unknown";
                logAction(
                    result.insertId,
                    "Complaint Filed",
                    `${user.fullname} (${user.emp_code})`,
                    user.dept_name || "—",
                    `Sent to ${deptName}.`
                );
            });

            return res.json({ success: true, complaint_id: complaintId });
        });
});

// ── MY FILED COMPLAINTS (Tab 1 history, if needed) ────────────────────────────
router.get("/api/complaints/my", ensureLoggedIn, (req, res) => {
    const user = req.session.user;
    const sql = `
        SELECT c.*, d.name as dept_name
        FROM complaints c
        LEFT JOIN departments d ON c.target_dept = d.id
        WHERE c.filed_by = ?
        ORDER BY c.created_at DESC
    `;
    db.query(sql, [user.id], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "DB error." });
        return res.json({ success: true, complaints: results });
    });
});

// ── RECEIVED COMPLAINTS (Tab 2 — my department's complaints) ─────────────────
router.get("/api/complaints/received", ensureLoggedIn, (req, res) => {
    const user = req.session.user;

    if (!user.dept_id) {
        return res.json({ success: true, complaints: [] });
    }

    const sql = `
        SELECT c.*, u.fullname as filed_by_name, u.emp_code as filed_by_emp,
            DATE_FORMAT(c.created_at, '%d-%m-%Y %H:%i') as date_formatted
        FROM complaints c
        LEFT JOIN users u ON c.filed_by = u.id
        WHERE c.target_dept = ?
        ORDER BY c.created_at DESC
    `;

    db.query(sql, [user.dept_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "DB error." });
        return res.json({ success: true, complaints: results });
    });
});

// ── GET ACTION HISTORY FOR A COMPLAINT ────────────────────────────────────────
router.get("/api/complaints/:id/history", ensureLoggedIn, (req, res) => {
    const sql = `
        SELECT *, DATE_FORMAT(created_at, '%d-%m-%Y %H:%i') as date_formatted
        FROM action_history WHERE complaint_id = ? ORDER BY created_at ASC
    `;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "DB error." });
        return res.json({ success: true, history: results });
    });
});

// ── UPDATE STATUS + REMARK ────────────────────────────────────────────────────
router.post("/api/complaints/:id/update", ensureLoggedIn, (req, res) => {
    const { status, remark } = req.body;
    const user = req.session.user;
    const id = req.params.id;

    if (!status) {
        return res.status(400).json({ success: false, error: "Status is required." });
    }

    db.query("UPDATE complaints SET status=?, remark=? WHERE id=?", [status, remark || "", id], (err) => {
        if (err) return res.status(500).json({ success: false, error: "Failed to update." });

        logAction(
            id,
            `Status changed to "${status}"`,
            `${user.fullname} (${user.emp_code})`,
            user.dept_name || "—",
            remark || "No remark added."
        );

        return res.json({ success: true });
    });
});

// ── FORWARD COMPLAINT TO ANOTHER DEPARTMENT ───────────────────────────────────
router.post("/api/complaints/:id/forward", ensureLoggedIn, (req, res) => {
    const { target_dept, assigned_to } = req.body;
    const user = req.session.user;
    const id = req.params.id;

    if (!target_dept) {
        return res.status(400).json({ success: false, error: "Select a department to forward to." });
    }

    db.query("SELECT name FROM departments WHERE id=?", [target_dept], (err, depts) => {
        if (err || !depts.length) return res.status(500).json({ success: false, error: "Department not found." });

        const newDeptName = depts[0].name;

        db.query(
            "UPDATE complaints SET target_dept=?, assigned_to=?, status='Pending' WHERE id=?",
            [target_dept, assigned_to || null, id],
            (err2) => {
                if (err2) return res.status(500).json({ success: false, error: "Forward failed." });

                logAction(
                    id,
                    `Forwarded to ${newDeptName}`,
                    `${user.fullname} (${user.emp_code})`,
                    user.dept_name || "—",
                    `Not in our department's scope. Forwarded to ${newDeptName}.`
                );

                return res.json({ success: true });
            }
        );
    });
});

// ── TRACK COMPLAINT (public, by complaint ID) ─────────────────────────────────
router.get("/track", (req, res) => {
    res.sendFile(path.join(__dirname, "track.html"));
});

router.post("/api/track", (req, res) => {
    const { complaint_id } = req.body;
    const sql = `
        SELECT c.*, d.name as dept_name
        FROM complaints c
        LEFT JOIN departments d ON c.target_dept = d.id
        WHERE c.complaint_id = ?
    `;
    db.query(sql, [complaint_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "DB error." });
        return res.json({ success: true, complaint: results[0] || null });
    });
});

module.exports = router;