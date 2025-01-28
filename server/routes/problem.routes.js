const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const express = require("express");
const router = express.Router();
const db = require("../config/db.config");
const multer = require("multer");
const { auth, checkRole } = require("../middleware/auth");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const validExt = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const validMime = allowedTypes.test(file.mimetype);
    cb(
      null,
      (validExt && validMime) ||
        new Error("เฉพาะไฟล์ .png, .jpg และ .jpeg เท่านั้น")
    );
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
             s.name as status_name,
             s.color as status_color,
             CONCAT(u.firstname, ' ', u.lastname) as reporter_name,
             CONCAT(a.firstname, ' ', a.lastname) as assigned_to_name,
             p.problem_type
      FROM problems p
      LEFT JOIN equipment e ON p.equipment_id = e.equipment_id
      LEFT JOIN users u ON p.reported_by = u.id
      LEFT JOIN users a ON p.assigned_to = a.id
      LEFT JOIN status s ON p.status_id = s.id
      WHERE ${req.user.role === "student" ? "p.reported_by = ?" : "1=1"}
      ORDER BY p.created_at DESC
    `;

    const params = req.user.role === "student" ? [req.user.id] : [];
    const [problems] = await db.execute(query, params);
    res.json({ success: true, data: problems });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new problem
router.post("/", auth, upload.single("image"), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { equipment_id, description, problem_type } = req.body;
    const reported_by = req.user.id;

    // Validate problem_type
    const validTypes = ["hardware", "software", "other"];
    if (!validTypes.includes(problem_type)) {
      throw new Error("ประเภทปัญหาไม่ถูกต้อง");
    }

    // Get equipment room
    const [equipment] = await connection.execute(
      "SELECT room FROM equipment WHERE equipment_id = ?",
      [equipment_id]
    );

    const [defaultStatus] = await connection.execute(
      "SELECT id FROM status WHERE name = 'pending' LIMIT 1"
    );

    const [result] = await connection.execute(
      `INSERT INTO problems (
        equipment_id, 
        description, 
        status_id, 
        image_url, 
        reported_by, 
        room,
        problem_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        equipment_id,
        description,
        defaultStatus[0]?.id,
        req.file?.filename || null,
        reported_by,
        equipment[0]?.room,
        problem_type,
      ]
    );

    await connection.commit();
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการแจ้งปัญหา",
    });
  } finally {
    connection.release();
  }
});

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
      const { status_id, comment } = req.body;

      const [status] = await connection.execute(
        "SELECT id FROM status WHERE id = ?",
        [status_id]
      );

      if (status.length === 0) {
        throw new Error("สถานะไม่ถูกต้อง");
      }

      await connection.execute(
        `UPDATE problems SET 
         status_id = ?, 
         comment = ?,
         updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [status_id, comment, id]
      );

      await connection.commit();
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({
        success: false,
        message: error.message || "เกิดข้อผิดพลาดในการอัพเดทสถานะ",
      });
    } finally {
      connection.release();
    }
  }
);

// Accept problem
router.patch("/:id/assign", auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE problems SET 
       assigned_to = ?,
       status_id = (SELECT id FROM status WHERE name = 'in_progress'),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, req.params.id]
    );
    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด" });
  } finally {
    connection.release();
  }
});

router.get(
  "/unfixable",
  auth,
  checkRole(["admin", "equipment_manager"]),
  async (req, res) => {
    try {
      const query = `
      SELECT 
        p.*,
        e.name as equipment_name,
        e.room as equipment_room,
        s.name as status_name,
        s.color as status_color,
        CONCAT(r.firstname, ' ', r.lastname) as reporter_name,
        CONCAT(a.firstname, ' ', a.lastname) as assigned_to_name
      FROM problems p
      LEFT JOIN equipment e ON p.equipment_id = e.equipment_id
      LEFT JOIN users r ON p.reported_by = r.id
      LEFT JOIN users a ON p.assigned_to = a.id
      LEFT JOIN status s ON p.status_id = s.id
      WHERE s.name = 'cannot_fix'
      ORDER BY p.updated_at DESC
    `;

      const [problems] = await db.execute(query);
      res.json({ success: true, data: problems });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูล",
      });
    }
  }
);

// Get unfixable problems
router.get(
  "/unfixable/pdf",
  auth,
  checkRole(["admin", "equipment_manager"]),
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [problems] = await connection.execute(`
        SELECT p.*, 
               e.name as equipment_name,
               e.room as equipment_room,
               s.name as status_name,
               CONCAT(r.firstname, ' ', r.lastname) as reporter_name,
               CONCAT(a.firstname, ' ', a.lastname) as assigned_to_name
        FROM problems p
        LEFT JOIN equipment e ON p.equipment_id = e.equipment_id
        LEFT JOIN users r ON p.reported_by = r.id
        LEFT JOIN users a ON p.assigned_to = a.id
        LEFT JOIN status s ON p.status_id = s.id
        WHERE s.name = 'cannot_fix'
        ORDER BY p.updated_at DESC
       `);

      const [ccStatus] = await connection.execute(
        "SELECT id FROM status WHERE name = 'referred_to_cc' LIMIT 1"
      );
      const ccStatusId = ccStatus[0]?.id;

      await connection.execute(
        `
        UPDATE problems p
        INNER JOIN status s ON p.status_id = s.id
        SET p.status_id = ?, p.comment = 'ส่งซ่อมที่ศูนย์คอมพิวเตอร์'
        WHERE s.name = 'cannot_fix'
      `,
        [ccStatusId]
      );

      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      doc.registerFont(
        "Sarabun",
        path.join(__dirname, "../fonts/Sarabun-Regular.ttf")
      );
      doc.font("Sarabun");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=unfixable_report_${Date.now()}.pdf`
      );
      doc.pipe(res);

      // Header
      doc
        .fontSize(20)
        .text("รายงานครุภัณฑ์ที่ไม่สามารถซ่อมได้", { align: "center" })
        .moveDown();

      doc
        .fontSize(12)
        .text(`วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")}`, {
          align: "right",
        })
        .moveDown(2);

      // Table setup
      const tableTop = 150;
      const tableLeft = 50;
      const tableRight = 550;
      const rowHeight = 40;
      doc.fontSize(8);

      // Draw table borders
      doc.lineWidth(1);
      doc.rect(tableLeft, tableTop, tableRight - tableLeft, rowHeight).stroke();
      doc
        .fillColor("#f3f4f6")
        .rect(tableLeft, tableTop, tableRight - tableLeft, rowHeight)
        .fill();
      doc.fillColor("#000000");

      const columns = [
        { x: 50, width: 90, title: "รหัสครุภัณฑ์" },
        { x: 140, width: 100, title: "ชื่ออุปกรณ์" },
        { x: 240, width: 60, title: "ห้อง" },
        { x: 300, width: 80, title: "ปัญหา" },
        { x: 380, width: 80, title: "เหตุผล" },
        { x: 460, width: 45, title: "ผู้แจ้ง" },
        { x: 505, width: 45, title: "ผู้รับผิดชอบ" },
      ];

      // Draw column headers
      columns.forEach((col) => {
        doc
          .moveTo(col.x, tableTop)
          .lineTo(col.x, tableTop + rowHeight * (problems.length + 1))
          .stroke();

        doc.fontSize(10).text(col.title, col.x + 5, tableTop + 10, {
          width: col.width - 10,
          align: "center",
        });
      });

      // Draw data rows
      let y = tableTop + rowHeight;

      problems.forEach((problem) => {
        if (y > 680) {
          doc.addPage();
          y = 50;
          doc.rect(tableLeft, y, tableRight - tableLeft, rowHeight).stroke();
          columns.forEach((col) => {
            doc.text(col.title, col.x + 2, y + 5, {
              width: col.width - 4,
              align: "center",
              lineGap: 2,
            });
          });
          y += rowHeight;
        }

        doc.rect(tableLeft, y, tableRight - tableLeft, rowHeight).stroke();

        doc
          .fontSize(8)
          .text(problem.equipment_id || "", columns[0].x + 2, y + 5, {
            width: columns[0].width - 4,
            lineGap: 2,
          })
          .text(problem.equipment_name || "", columns[1].x + 2, y + 5, {
            width: columns[1].width - 4,
            lineGap: 2,
          })
          .text(problem.equipment_room || "", columns[2].x + 2, y + 5, {
            width: columns[2].width - 4,
            align: "center",
            lineGap: 2,
          })
          .text(problem.description || "", columns[3].x + 2, y + 5, {
            width: columns[3].width - 4,
            lineGap: 2,
          })
          .text(problem.comment || "", columns[4].x + 2, y + 5, {
            width: columns[4].width - 4,
            lineGap: 2,
          })
          .text(problem.reporter_name || "", columns[5].x + 2, y + 5, {
            width: columns[5].width - 4,
            align: "center",
            lineGap: 2,
          })
          .text(problem.assigned_to_name || "-", columns[6].x + 2, y + 5, {
            width: columns[6].width - 4,
            align: "center",
            lineGap: 2,
          });

        y += rowHeight;
      });

      // Draw final table border
      doc.moveTo(tableRight, tableTop).lineTo(tableRight, y).stroke();

      const signY = y + 50;

      // Signatures
      doc
        .fontSize(10)
        .text(
          "ลงชื่อ.......................................................",
          100,
          signY
        )
        .text(
          "(.........................................................)",
          100,
          signY + 25
        )
        .text("ผู้จัดการครุภัณฑ์", 120, signY + 50);

      doc
        .text(
          "ลงชื่อ.......................................................",
          350,
          signY
        )
        .text(
          "(.........................................................)",
          350,
          signY + 25
        )
        .text("หัวหน้าศูนย์นวัตกรรมดิจิทัล", 360, signY + 50)
        .text("ศูนย์นวัตกรรมดิจิทัล", 370, signY + 75)
        .text("มหาวิทยาลัยวลัยลักษณ์", 365, signY + 100);

      doc.end();
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("Error:", error);
      res.status(500).json({ success: false, message: "Error generating PDF" });
    } finally {
      connection.release();
    }
  }
);

module.exports = router;
