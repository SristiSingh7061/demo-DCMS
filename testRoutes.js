const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    console.log("TEST ROUTE / HIT");
    res.send("TEST HOME");
});

router.get("/test", (req, res) => {
    res.send("TEST ROUTE");
});

module.exports = router;
