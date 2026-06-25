const mysql = require("mysql2");

const db = mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "ccl_cms"
});

db.connect((err) => {
    if (err) {
        console.error("❌ MySQL Connection Failed:", err.message);
        console.error("👉 Check: XAMPP MySQL is running, and 'ccl_cms' database exists.");
    } else {
        console.log("🟩 MySQL Connected! (ccl_cms)");
    }
});

module.exports = db;



/*const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",          // XAMPP default — blank password
    database: "ccl_cms"
});

db.connect((err) => {
    if (err) {
        console.error("❌ MySQL Connection Failed:", err.message);
        console.error("👉 Check: XAMPP MySQL is running, and 'ccl_cms' database exists.");
    } else {
        console.log("✅ MySQL Connected! (ccl_cms)");
    }
});

module.exports = db;*/