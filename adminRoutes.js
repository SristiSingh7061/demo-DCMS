const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("./db");

function ensureAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === "admin") return next();
    return res.status(403).json({ success: false, error: "Admin access required." });
}

// ── GET ALL COMPLAINTS (monitoring only — read-only) ──────────────────────────
router.get("/api/admin/complaints", ensureAdmin, (req, res) => {
    const sql = `
        SELECT c.*, u.fullname as filed_by_name, u.emp_code as filed_by_emp,
            d.name as dept_name,
            DATE_FORMAT(c.created_at, '%d-%m-%Y %H:%i') as date_formatted
        FROM complaints c
        LEFT JOIN users u ON c.filed_by = u.id
        LEFT JOIN departments d ON c.target_dept = d.id
        ORDER BY c.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "DB error." });
        return res.json({ success: true, complaints: results });
    });
});

// ── GET ALL USERS ──────────────────────────────────────────────────────────────
router.get("/api/admin/users", ensureAdmin, (req, res) => {
    const sql = `
        SELECT u.id, u.fullname, u.emp_code, u.email, u.role, d.name as dept_name, u.dept_id
        FROM users u
        LEFT JOIN departments d ON u.dept_id = d.id
        ORDER BY u.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "DB error." });
        return res.json({ success: true, users: results });
    });
});

// ── ADD NEW USER (Employee) ────────────────────────────────────────────────────
router.post("/api/admin/users", ensureAdmin, async (req, res) => {
    const { fullname, emp_code, email, password, dept_id, role } = req.body;

    if (!fullname || !emp_code || !password) {
        return res.status(400).json({ success: false, error: "Name, Employee Code and Password are required." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (fullname, emp_code, email, password, dept_id, role) VALUES (?,?,?,?,?,?)`;

        db.query(sql, [fullname, emp_code, email || null, hashedPassword, dept_id || null, role || "user"], (err, result) => {
            if (err) {
                let msg = "Failed to add user.";
                if (err.code === "ER_DUP_ENTRY") msg = "Employee Code already exists.";
                return res.status(400).json({ success: false, error: msg });
            }
            return res.json({ success: true, id: result.insertId });
        });
    } catch (e) {
        return res.status(500).json({ success: false, error: "Server error." });
    }
});

// ── EDIT USER ───────────────────────────────────────────────────────────────────
router.post("/api/admin/users/:id/edit", ensureAdmin, async (req, res) => {
    const { fullname, email, dept_id, role, password } = req.body;
    const id = req.params.id;

    try {
        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            db.query(
                "UPDATE users SET fullname=?, email=?, dept_id=?, role=?, password=? WHERE id=?",
                [fullname, email || null, dept_id || null, role, hashedPassword, id],
                (err) => {
                    if (err) return res.status(500).json({ success: false, error: "Update failed." });
                    return res.json({ success: true });
                }
            );
        } else {
            db.query(
                "UPDATE users SET fullname=?, email=?, dept_id=?, role=? WHERE id=?",
                [fullname, email || null, dept_id || null, role, id],
                (err) => {
                    if (err) return res.status(500).json({ success: false, error: "Update failed." });
                    return res.json({ success: true });
                }
            );
        }
    } catch (e) {
        return res.status(500).json({ success: false, error: "Server error." });
    }
});

// ── GET ALL DEPARTMENTS (admin view) ──────────────────────────────────────────
router.get("/api/admin/departments", ensureAdmin, (req, res) => {
    db.query("SELECT * FROM departments ORDER BY name", (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "DB error." });
        return res.json({ success: true, departments: results });
    });
});

// ── ADD NEW DEPARTMENT ─────────────────────────────────────────────────────────
router.post("/api/admin/departments", ensureAdmin, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Department name required." });

    db.query("INSERT INTO departments (name) VALUES (?)", [name], (err, result) => {
        if (err) {
            let msg = "Failed to add department.";
            if (err.code === "ER_DUP_ENTRY") msg = "Department already exists.";
            return res.status(400).json({ success: false, error: msg });
        }
        return res.json({ success: true, id: result.insertId });
    });
});
router.post("/api/admin/departments/:id/close", ensureAdmin, (req, res) => {
    db.query("UPDATE departments SET status = 'inactive' WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, error: "DB error." });
        return res.json({ success: true });
    });
});

router.post("/api/admin/departments/:id/reopen", ensureAdmin, (req, res) => {
    db.query("UPDATE departments SET status = 'active' WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, error: "DB error." });
        return res.json({ success: true });
    });
});
module.exports = router;