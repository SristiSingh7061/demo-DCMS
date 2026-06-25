const express = require("express");
const path = require("path");
const testRoutes = require("./testRoutes");

console.log("Test server starting...");
console.log("testRoutes type:", typeof testRoutes);

const app = express();

app.use("/", testRoutes);
console.log("Test routes mounted");

app.listen(3001, () => {
  console.log("Test server running on http://localhost:3001");
});
