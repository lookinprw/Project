const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Enable CORS
app.use(cors());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Test routes
app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "API is working!",
    time: new Date().toISOString(),
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("\n=== SERVER STARTED ===");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Port: ${PORT}`);
  console.log("\nTest URLs:");
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://localhost:${PORT}/api/test`);
  console.log("\nPress Ctrl+C to stop the server");
});
