// Run this ONCE to create your first Admin account
// Command: node setup-admin.js

const mysql = require("mysql2");
const bcrypt = require("bcrypt");

const db = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "ccl_cms"
});

const ADMIN_NAME = "Admin User";
const ADMIN_EMP_CODE = "ADMIN1";
const ADMIN_EMAIL = "admin@ccl.com";
const ADMIN_PASSWORD = "admin123";   // Change this if you want

db.connect(async (err) => {
    if (err) {
        console.error("❌ Could not connect to MySQL:", err.message);
        process.exit(1);
    }

    console.log("✅ Connected to MySQL");

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const sql = `INSERT INTO users (fullname, emp_code, email, password, dept_id, role)
                 VALUES (?, ?, ?, ?, NULL, 'admin')`;

    db.query(sql, [ADMIN_NAME, ADMIN_EMP_CODE, ADMIN_EMAIL, hashedPassword], (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                console.log("⚠️  Admin account already exists with this Employee Code.");
            } else {
                console.error("❌ Error creating admin:", err.message);
            }
        } else {
            console.log("🎉 Admin account created successfully!");
            console.log("─────────────────────────────");
            console.log("Employee Code:", ADMIN_EMP_CODE);
            console.log("Password:", ADMIN_PASSWORD);
            console.log("─────────────────────────────");
            console.log("👉 Login at http://localhost:3000/login");
        }
        db.end();
    });
});