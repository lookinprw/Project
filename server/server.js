const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();


console.log("\n=== SERVER STARTUP DEBUG INFO ===");
console.log("Current Directory:", __dirname);
console.log("\nEnvironment Variables:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET ? "Set" : "Not Set",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ? "Set" : "Not Set",
  FRONTEND_URL: process.env.FRONTEND_URL,
});

const corsOptions = {
  origin: [process.env.FRONTEND_URL, "http://localhost:3000", /\.vercel\.app$/],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    status: "Server is running",
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    apis: {
      users: "/api/users",
      equipment: "/api/equipment",
      problems: "/api/problems",
    },
  });
});

const loadRoute = (path, router) => {
  try {
    app.use(`/api/${path}`, require(`./routes/${router}`));
    console.log(`Route loaded: /api/${path}`);
  } catch (error) {
    console.error(`Failed to load route /api/${path}:`, error);
  }
};

loadRoute("users", "users.routes");
loadRoute("equipment", "equipment.routes");
loadRoute("problems", "problem.routes");
loadRoute("status", "status.routes");

app.use("/api/*", (req, res) => {
  console.log("404 - Route not found:", req.originalUrl);
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    requestedUrl: req.originalUrl,
  });
});

if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "build");
  app.use(express.static(buildPath));
  app.get("*", function (req, res) {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

app.use((err, req, res, next) => {
  console.error("\nError occurred:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    path: req.path,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
const MAX_RETRIES = 3;
let retryCount = 0;
startServer = () => {
  try {
    const server = app.listen(PORT, () => {
      console.log("\n=== SERVER STARTED SUCCESSFULLY ===");
      console.log(`Server running on port ${PORT}`);
    });

    // Add detailed error handling
    server.on('error', (error) => {
      console.error('Server Error Details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
    });

  } catch (error) {
    console.error('Startup Error Details:', {
      message: error.message,
      stack: error.stack
    });
  }
};

startServer();
module.exports = app;
