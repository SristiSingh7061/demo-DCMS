const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();

app.use(session({
    secret: "ccl_secret_key",
    resave: false,
    saveUninitialized: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require("./authRoutes");
const complaintRoutes = require("./complaintRoutes");
const adminRoutes = require("./adminRoutes");

app.use("/", authRoutes);
app.use("/", complaintRoutes);
app.use("/", adminRoutes);

// Static files (HTML, CSS, JS, images)
app.use(express.static(__dirname));

// 404 handler
app.use((req, res) => {
    console.log(`NO MATCH FOR: ${req.method} ${req.path}`);
    res.status(404).send("Cannot " + req.method + " " + req.path);
});

// Error handler
app.use((err, req, res, next) => {
    console.error("ERROR:", err.message);
    res.status(500).json({ success: false, error: err.message });
});

app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});