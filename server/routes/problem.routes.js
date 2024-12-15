const express = require("express");
const router = express.Router();
const db = require("../config/db.config");
const multer = require("multer");
const path = require("path");
const { auth, checkRole } = require("../middleware/auth");
const lineService = require("../services/lineMessaging");

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("เฉพาะไฟล์ .png, .jpg และ .jpeg เท่านั้น"));
    }
  },
});

// Get all problems
router.get("/", auth, async (req, res) => {
  try {
    let query = `
      SELECT p.*, 
             e.name as equipment_name,   
             e.equipment_id,             
             e.status as equipment_status,
             CONCAT(u.firstname, ' ', u.lastname) as reporter_name,
             CONCAT(a.firstname, ' ', a.lastname) as assigned_to_name
      FROM problems p
      LEFT JOIN equipment e ON p.equipment_id = e.equipment_id
      LEFT JOIN users u ON p.reported_by = u.id
      LEFT JOIN users a ON p.assigned_to = a.id
    `;

    // Filter based on user role
    if (req.user.role === "student") {
      query += ` WHERE p.reported_by = ?`;
    } else if (req.user.role === "equipment_assistant") {
      query += ` WHERE (p.assigned_to = ? OR p.status = 'pending')`;
    }
    // Admin and equipment_manager can see all problems

    query += ` ORDER BY p.created_at DESC`;

    const [problems] = await db.execute(
      query,
      req.user.role === "student" || req.user.role === "equipment_assistant"
        ? [req.user.id]
        : []
    );

    res.json({
      success: true,
      data: problems,
    });
  } catch (error) {
    console.error("Error fetching problems:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลปัญหา",
    });
  }
});

// Create new problem
router.post("/", auth, upload.single("image"), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { equipment_id, description } = req.body;
    const reported_by = req.user.id;

    if (!equipment_id || !description) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลให้ครบถ้วน",
      });
    }

    // Get equipment details and staff users' LINE IDs
    const [equipment] = await connection.execute(
      `SELECT e.*, u.line_user_id, u.id as user_id
       FROM equipment e 
       LEFT JOIN users u ON u.role IN ('admin', 'equipment_manager', 'equipment_assistant')
       WHERE e.equipment_id = ?`,
      [equipment_id]
    );

    if (equipment.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบครุภัณฑ์",
      });
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    // Insert problem
    const [result] = await connection.execute(
      `INSERT INTO problems (
        equipment_id, description, status, image_url, reported_by, room
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        equipment_id,
        description,
        "pending",
        image_url,
        reported_by,
        equipment[0].room,
      ]
    );

    const newProblem = {
      id: result.insertId,
      equipment_id,
      equipment_name: equipment[0].name,
      description,
      room: equipment[0].room,
      status: "pending",
      image_url,
      reported_by,
    };

    // Send LINE notifications
    const notificationPromises = equipment
      .filter((eq) => eq.line_user_id)
      .map((eq) =>
        lineService
          .sendProblemNotification(eq.line_user_id, newProblem)
          .catch((error) => {
            console.error(
              `Failed to send LINE notification to ${eq.line_user_id}:`,
              error
            );
          })
      );

    await Promise.all(notificationPromises);
    await connection.commit();

    res.status(201).json({
      success: true,
      message: "แจ้งปัญหาสำเร็จ",
      data: newProblem,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating problem:", error);
    res.status(500).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการแจ้งปัญหา",
    });
  } finally {
    connection.release();
  }
});

// Handle problem assignment
router.patch(
  "/:id/assign",
  auth,
  checkRole(["admin", "equipment_manager", "equipment_assistant"]),
  async (req, res) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const staffId = req.user.id;

      const [problem] = await connection.execute(
        "SELECT assigned_to FROM problems WHERE id = ?",
        [id]
      );

      if (!problem.length) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "ไม่พบข้อมูลปัญหา",
        });
      }

      if (problem[0].assigned_to) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "ปัญหานี้มีผู้รับผิดชอบแล้ว",
        });
      }

      await connection.execute(
        `UPDATE problems 
         SET assigned_to = ?,
             status = 'in_progress',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [staffId, id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "รับมอบหมายงานสำเร็จ",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error assigning problem:", error);
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการรับมอบหมายงาน",
      });
    } finally {
      connection.release();
    }
  }
);

// Update problem status
router.patch(
  "/:id/status",
  auth,
  checkRole(["admin", "equipment_manager", "equipment_assistant"]),
  async (req, res) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { status, comment } = req.body;
      const userRole = req.user.role;
      const userId = req.user.id;

      const validStatuses = [
        "pending",
        "in_progress",
        "resolved",
        "cannot_fix",
      ];

      if (!validStatuses.includes(status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "สถานะไม่ถูกต้อง",
        });
      }

      // Require comment for cannot_fix status
      if (status === "cannot_fix") {
        if (!comment?.trim()) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: "กรุณาระบุเหตุผลที่ไม่สามารถแก้ไขได้",
          });
        }

        // Only admin and equipment_manager can mark as cannot_fix
        if (!["admin", "equipment_manager"].includes(userRole)) {
          await connection.rollback();
          return res.status(403).json({
            success: false,
            message: "ไม่มีสิทธิ์ในการกำหนดสถานะไม่สามารถแก้ไขได้",
          });
        }
      }

      // Get current problem details
      const [problems] = await connection.execute(
        `SELECT p.*, e.equipment_id, u.line_user_id
         FROM problems p 
         LEFT JOIN equipment e ON p.equipment_id = e.equipment_id 
         LEFT JOIN users u ON p.reported_by = u.id
         WHERE p.id = ?`,
        [id]
      );

      if (problems.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "ไม่พบข้อมูลการแจ้งปัญหา",
        });
      }

      const problem = problems[0];
      const previousStatus = problem.status; // Store the current status before updating

      // Update problem status
      await connection.execute(
        `UPDATE problems 
         SET status = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, id]
      );

      // Insert into problem_updates table with correct columns
      await connection.execute(
        `INSERT INTO problem_updates 
         (problem_id, updated_by, previous_status, new_status, comment) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, userId, previousStatus, status, comment || null]
      );

      // If status is 'cannot_fix', update equipment status
      if (status === "cannot_fix") {
        await connection.execute(
          `UPDATE equipment 
           SET status = 'inactive',
               updated_at = CURRENT_TIMESTAMP 
           WHERE equipment_id = ?`,
          [problem.equipment_id]
        );

        // Send LINE notification to reporter if they have LINE connected
        if (problem.line_user_id) {
          try {
            await lineService.sendCannotFixNotification(problem.line_user_id, {
              ...problem,
              comment: comment,
            });
          } catch (error) {
            console.error("Error sending LINE notification:", error);
            // Don't throw error, continue with the process
          }
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: "อัพเดทสถานะสำเร็จ",
        data: {
          id: problem.id,
          status: status,
          equipment_id: problem.equipment_id,
          equipment_status: status === "cannot_fix" ? "inactive" : null,
          comment: comment || null,
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error updating status:", error);
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการอัพเดทสถานะ",
      });
    } finally {
      connection.release();
    }
  }
);

// Reassign problem
router.patch(
  "/:id/reassign",
  auth,
  checkRole(["admin", "equipment_manager"]),
  async (req, res) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { assigned_to } = req.body;

      if (!assigned_to) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "กรุณาระบุผู้รับผิดชอบ",
        });
      }

      // Verify the assigned user is staff
      const [staff] = await connection.execute(
        `SELECT id FROM users 
         WHERE id = ? AND role IN ('admin', 'equipment_manager', 'equipment_assistant')`,
        [assigned_to]
      );

      if (staff.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "ผู้รับผิดชอบต้องเป็นเจ้าหน้าที่เท่านั้น",
        });
      }

      await connection.execute(
        `UPDATE problems 
         SET assigned_to = ?,
             status = 'in_progress',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [assigned_to, id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "มอบหมายงานใหม่สำเร็จ",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error reassigning problem:", error);
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการมอบหมายงานใหม่",
      });
    } finally {
      connection.release();
    }
  }
);

// Get unfixable problems
router.get(
  "/unfixable",
  auth,
  checkRole(["admin", "equipment_manager"]),
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      const [problems] = await connection.execute(`
      SELECT p.*, 
             e.name as equipment_name,
             e.equipment_id,
             e.status as equipment_status,
             CONCAT(u.firstname, ' ', u.lastname) as reporter_name,
             CONCAT(a.firstname, ' ', a.lastname) as assigned_to_name,
             pu.comment as cannot_fix_reason
      FROM problems p
      LEFT JOIN equipment e ON p.equipment_id = e.equipment_id
      LEFT JOIN users u ON p.reported_by = u.id
      LEFT JOIN users a ON p.assigned_to = a.id
      LEFT JOIN (
        SELECT problem_id, comment, created_at
        FROM problem_updates
        WHERE new_status = 'cannot_fix'
      ) pu ON p.id = pu.problem_id
      WHERE p.status = 'cannot_fix'  -- Changed back to status
      ORDER BY p.updated_at DESC
    `);

      res.json({
        success: true,
        data: problems,
      });
    } catch (error) {
      console.error("Error fetching unfixable problems:", error);
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลปัญหาที่ไม่สามารถแก้ไขได้",
      });
    } finally {
      connection.release();
    }
  }
);

module.exports = router;
