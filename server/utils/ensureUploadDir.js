// utils/ensureUploadDir.js
const fs = require("fs");
const path = require("path");

const ensureUploadDir = () => {
  const uploadDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("Created uploads directory");
  }
};

module.exports = ensureUploadDir;
