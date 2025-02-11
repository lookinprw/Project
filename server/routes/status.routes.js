const express = require("express");
const router = express.Router();
const db = require("../config/db.config");
const { auth, checkRole } = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  try {
    const [statuses] = await db.execute(
      "SELECT * FROM status ORDER BY created_at DESC"
    );
    res.json({ success: true, data: statuses });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});

router.post(
  "/",
  auth,
  checkRole(["admin", "equipment_manager"]),
  async (req, res) => {
    try {
      const { name, description, color } = req.body;
      const [result] = await db.execute(
        "INSERT INTO status (name, description, color) VALUES (?, ?, ?)",
        [name, description, color]
      );
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "เกิดข้อผิดพลาดในการเพิ่มสถานะ" });
    }
  }
);

// Update status
router.put(
  "/:id",
  auth,
  checkRole(["admin", "equipment_manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, color } = req.body;
      await db.execute(
        "UPDATE status SET name = ?, description = ?, color = ? WHERE id = ?",
        [name, description, color, id]
      );
      res.json({ success: true });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "เกิดข้อผิดพลาดในการแก้ไข" });
    }
  }
);

// Delete status
router.delete(
  "/:id",
  auth,
  checkRole(["admin", "equipment_manager"]),
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { id } = req.params;

      // Check if status is in use
      const [problems] = await connection.execute(
        "SELECT id FROM problems WHERE status_id = ?",
        [id]
      );

      if (problems.length > 0) {
        throw new Error("ไม่สามารถลบสถานะที่กำลังถูกใช้งาน");
      }

      await connection.execute("DELETE FROM status WHERE id = ?", [id]);
      await connection.commit();
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      res.status(400).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  }
);

module.exports = router;
