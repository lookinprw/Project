const express = require("express");
const router = express.Router();
const db = require("../config/db.config");
const { auth, checkRole } = require("../middleware/auth");

const VALID_STATUSES = ["active", "maintenance", "inactive"];

router.get("/", auth, async (req, res) => {
  try {
    const [equipment] = await db.execute(`
      SELECT 
        id,
        equipment_id,
        name,  
        type,
        room,
        status,
        created_at,
        updated_at
      FROM equipment 
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    console.error("Error fetching equipment:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching equipment",
    });
  }
});


router.post(
  "/",
  auth,
  checkRole(["admin", "equipment_manager"]),
  async (req, res) => {
    try {
      const { equipment_id, name, type, room, status = "active" } = req.body;

      // Validate required fields
      if (!equipment_id || !name || !type || !room) {
        return res.status(400).json({
          success: false,
          message: "กรุณากรอกข้อมูลให้ครบถ้วน",
        });
      }

      // Validate status
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "สถานะไม่ถูกต้อง",
        });
      }

      // Check if equipment_id already exists
      const [existing] = await db.execute(
        "SELECT id FROM equipment WHERE equipment_id = ?",
        [equipment_id]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: "รหัสครุภัณฑ์นี้มีอยู่ในระบบแล้ว",
        });
      }

      const [result] = await db.execute(
        "INSERT INTO equipment (equipment_id, name, type, room, status) VALUES (?, ?, ?, ?, ?)",
        [equipment_id, name, type, room, status]
      );

      res.status(201).json({
        success: true,
        message: "เพิ่มครุภัณฑ์สำเร็จ",
        data: {
          id: result.insertId,
          equipment_id,
          name,
          type,
          room,
          status,
        },
      });
    } catch (error) {
      console.error("Error adding equipment:", error);
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการเพิ่มครุภัณฑ์",
      });
    }
  }
);

// Update equipment
router.put("/:id", auth, checkRole(["admin", "equipment_manager"]), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { equipment_id, name, type, room, status } = req.body;

    // Get all problems for this equipment
    const [problems] = await connection.execute(
      `SELECT p.*, s.id as status_id 
       FROM problems p 
       JOIN status s ON p.status_id = s.id 
       WHERE p.equipment_id = ?`,
      [equipment_id]
    );

    // Check active problems
    const hasActiveProblems = problems.some(p => 
      [1, 2, 7].includes(p.status_id) // รอดำเนินการ, กำลังดำเนินการ, กำลังส่งไปศูนย์คอม
    );

    if (hasActiveProblems && status === 'active') {
      throw new Error("ไม่สามารถเปลี่ยนสถานะเป็นใช้งานได้เนื่องจากมีการแจ้งปัญหาที่ยังไม่เสร็จสิ้น");
    }

    await connection.execute(
      `UPDATE equipment 
       SET equipment_id = ?, name = ?, type = ?, room = ?, status = ?
       WHERE id = ?`,
      [equipment_id, name, type, room, status, id]
    );

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาด"
    });
  } finally {
    connection.release();
  }
});

// Delete equipment (admin only)
router.delete("/:id", auth, checkRole(["admin", "equipment_manager"]), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // First check if equipment exists and get its equipment_id
    const [equipment] = await connection.execute(
      "SELECT equipment_id FROM equipment WHERE id = ?",
      [id]
    );

    if (equipment.length === 0) {
      throw new Error("ไม่พบครุภัณฑ์ที่ต้องการลบ");
    }

    // Check if equipment has any problems
    const [problems] = await connection.execute(
      "SELECT id FROM problems WHERE equipment_id = ?",
      [equipment[0].equipment_id]
    );

    if (problems.length > 0) {
      throw new Error("ไม่สามารถลบครุภัณฑ์ได้เนื่องจากมีการแจ้งปัญหาที่เกี่ยวข้อง");
    }

    // Delete the equipment if no problems are associated
    const [result] = await connection.execute(
      "DELETE FROM equipment WHERE id = ?", 
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error("ไม่พบครุภัณฑ์ที่ต้องการลบ");
    }

    await connection.commit();
    res.json({ 
      success: true, 
      message: "ลบครุภัณฑ์สำเร็จ" 
    });

  } catch (error) {
    await connection.rollback();
    res.status(400).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการลบครุภัณฑ์"
    });
  } finally {
    connection.release();
  }
});

// Get single equipment
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const [equipment] = await db.execute(
      "SELECT * FROM equipment WHERE id = ?",
      [id]
    );

    if (equipment.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบครุภัณฑ์",
      });
    }

    res.json({
      success: true,
      data: equipment[0],
    });
  } catch (error) {
    console.error("Error fetching equipment:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลครุภัณฑ์",
    });
  }
});

module.exports = router;
