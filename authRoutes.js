const path = require("path");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("./db");

// ── HOME ─────────────────────────────────────────────────────────────────────
router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
router.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

// ── LOGIN (Employee Code + Password) ──────────────────────────────────────────
router.post("/login", (req, res) => {
    const { emp_code, password } = req.body;

    if (!emp_code || !password) {
        return res.status(400).json({ success: false, error: "Employee Code and Password required." });
    }

    const sql = `
        SELECT u.*, d.name as dept_name
        FROM users u
        LEFT JOIN departments d ON u.dept_id = d.id
        WHERE u.emp_code = ?
    `;

    db.query(sql, [emp_code.trim()], async (err, results) => {
        if (err) {
            console.error("Login DB error:", err);
            return res.status(500).json({ success: false, error: "Database error." });
        }
        if (results.length === 0) {
            return res.status(401).json({ success: false, error: "Invalid Employee Code or Password." });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ success: false, error: "Invalid Employee Code or Password." });
        }

        req.session.user = {
            id: user.id,
            fullname: user.fullname,
            emp_code: user.emp_code,
            email: user.email,
            dept_id: user.dept_id,
            dept_name: user.dept_name,
            role: user.role
        };

        const redirect = user.role === "admin" ? "/dashboard/admin" : "/dashboard/user";
        return res.json({ success: true, redirect });
    });
});

// ── LOGOUT ────────────────────────────────────────────────────────────────────
router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});

// ── SESSION CHECK ─────────────────────────────────────────────────────────────
router.get("/api/session", (req, res) => {
    res.json({ user: req.session.user || null });
});

// ── DASHBOARD PAGES ───────────────────────────────────────────────────────────
router.get("/dashboard/user", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.sendFile(path.join(__dirname, "user-dashboard.html"));
});

router.get("/dashboard/admin", (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") return res.redirect("/login");
    res.sendFile(path.join(__dirname, "admin-dashboard.html"));
});

module.exports = router;