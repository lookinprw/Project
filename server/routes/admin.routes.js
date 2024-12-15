const express = require("express");
const router = express.Router();
const { createRichMenu } = require("../services/lineRichMenu");
const { auth, checkRole } = require("../middleware/auth");

// Admin only route to create/update rich menu
router.post("/line/rich-menu", auth, checkRole(["admin"]), async (req, res) => {
  try {
    const { force } = req.body;
    await createRichMenu(force);
    res.json({ success: true, message: "Rich menu setup completed" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
