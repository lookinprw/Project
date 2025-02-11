const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const express = require("express");
const router = express.Router();
const db = require("../config/db.config");
const multer = require("multer");
const { auth, checkRole } = require("../middleware/auth");
const uploadDir = path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Format: DATE_EQUIPMENTID_TYPE.extension
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const time = new Date().toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
    const equipmentId = req.body.equipment_id || "unknown";
    const problemType = req.body.problem_type || "unknown";

    const filename = `${date}_${time}_${equipmentId}_${problemType}${path.extname(
      file.originalname
    )}`;
    cb(null, filename);
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
      WHERE ${req.user.role === "reporter" ? "p.reported_by = ?" : "1=1"}
      ORDER BY p.created_at DESC
    `;

    const params = req.user.role === "reporter" ? [req.user.id] : [];
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

    // Validate length
    if (description.length < 5) {
      throw new Error("กรุณากรอกรายละเอียดปัญหาอย่างน้อย 5 ตัวอักษร");
    }

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

    // Get default status (id = 1 for รอดำเนินการ)
    const [defaultStatus] = await connection.execute(
      "SELECT id FROM status WHERE id = 1 LIMIT 1"
    );

    if (!defaultStatus[0]) {
      throw new Error("ไม่พบสถานะเริ่มต้น");
    }

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
        defaultStatus[0].id,
        req.file?.filename || null,
        reported_by,
        equipment[0]?.room || null,
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

router.delete(
  "/:id",
  auth,
  checkRole(["admin", "equipment_manager"]),
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // First check if problem exists
      const [problem] = await connection.execute(
        "SELECT * FROM problems WHERE id = ?",
        [req.params.id]
      );

      if (problem.length === 0) {
        throw new Error("ไม่พบรายการที่ต้องการลบ");
      }

      // Delete any associated images if they exist
      if (problem[0].image_url) {
        const imagePath = path.join(uploadDir, problem[0].image_url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      // Delete the problem
      await connection.execute("DELETE FROM problems WHERE id = ?", [
        req.params.id,
      ]);

      await connection.commit();
      res.json({ success: true, message: "ลบรายการสำเร็จ" });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({
        success: false,
        message: error.message || "เกิดข้อผิดพลาดในการลบข้อมูล",
      });
    } finally {
      connection.release();
    }
  }
);

// Update problem status
router.patch("/:id/status", auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { status_id, comment } = req.body;

    // First get the problem and equipment details
    const [problems] = await connection.execute(
      "SELECT p.*, e.equipment_id FROM problems p LEFT JOIN equipment e ON p.equipment_id = e.equipment_id WHERE p.id = ?",
      [id]
    );

    if (problems.length === 0) {
      throw new Error("ไม่พบรายการที่ต้องการอัพเดท");
    }

    const problem = problems[0];

    // Update equipment status based on problem status
    let equipmentStatus;
    switch (parseInt(status_id)) {
      case 1: // รอดำเนินการ
      case 2: // กำลังดำเนินการ
      case 7: // กำลังส่งไปศูนย์คอม
        equipmentStatus = "maintenance";
        break;
      case 4: // ไม่สามารถแก้ไขได้
      case 8: // ชำรุดเสียหาย
        equipmentStatus = "inactive";
        break;
      case 3: // เสร็จสิ้น
        equipmentStatus = "active";
        break;
    }

    // Update equipment status if needed
    if (equipmentStatus && problem.equipment_id) {
      await connection.execute(
        "UPDATE equipment SET status = ? WHERE equipment_id = ?",
        [equipmentStatus, problem.equipment_id]
      );
    }

    // Update problem status
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
});

// Accept problem
router.patch("/:id/assign", auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const inProgressStatusId = 2; // In Progress status

    await connection.execute(
      `UPDATE problems SET 
       assigned_to = ?,
       status_id = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, inProgressStatusId, req.params.id]
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
      WHERE s.name = 'ไม่สามารถแก้ไขได้'
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

      // Get problems with status_id = 4 (Cannot Fix)
      const [problems] = await connection.execute(`
      SELECT p.*, 
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
      WHERE p.status_id = 4
      ORDER BY p.updated_at DESC
    `);

      // Update problems to Computer Center status (ID: 7)
      await connection.execute(
        `UPDATE problems SET status_id = 7, comment = 'ส่งซ่อมที่ศูนย์คอมพิวเตอร์'
       WHERE status_id = 4`
      );

      // Generate PDF
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
        { x: 50, width: 40, title: "ลำดับ" },
        { x: 90, width: 90, title: "รหัสครุภัณฑ์" },
        { x: 180, width: 90, title: "ชื่ออุปกรณ์" },
        { x: 270, width: 50, title: "ห้อง" },
        { x: 320, width: 80, title: "ปัญหา" },
        { x: 400, width: 80, title: "เหตุผล" },
        { x: 480, width: 35, title: "ผู้แจ้ง" },
        { x: 515, width: 35, title: "ผู้รับผิดชอบ" },
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

      problems.forEach((problem, index) => {
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
          .text(String(index + 1), columns[0].x + 2, y + 5, {
            width: columns[0].width - 4,
            align: "center",
            lineGap: 2,
          })
          .text(problem.equipment_id || "", columns[1].x + 2, y + 5, {
            width: columns[1].width - 4,
            lineGap: 2,
          })
          .text(problem.equipment_name || "", columns[2].x + 2, y + 5, {
            width: columns[2].width - 4,
            lineGap: 2,
          })
          .text(problem.equipment_room || "", columns[3].x + 2, y + 5, {
            width: columns[3].width - 4,
            align: "center",
            lineGap: 2,
          })
          .text(problem.description || "", columns[4].x + 2, y + 5, {
            width: columns[4].width - 4,
            lineGap: 2,
          })
          .text(problem.comment || "", columns[5].x + 2, y + 5, {
            width: columns[5].width - 4,
            lineGap: 2,
          })
          .text(problem.reporter_name || "", columns[6].x + 2, y + 5, {
            width: columns[6].width - 4,
            align: "center",
            lineGap: 2,
          })
          .text(problem.assigned_to_name || "-", columns[7].x + 2, y + 5, {
            width: columns[7].width - 4,
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

// Get similar problems route
router.get("/similar/:equipmentId/:problemType", auth, async (req, res) => {
  const { equipmentId, problemType } = req.params;

  try {
    const activeStatusIds = [1, 2, 7]; // รอดำเนินการ, กำลังดำเนินการ, กำลังส่งไปศูนย์คอม

    const [problems] = await db.execute(
      `
      SELECT p.*, s.name as status_name, s.color as status_color,
             e.name as equipment_name,
             u.firstname, u.lastname
      FROM problems p
      JOIN status s ON p.status_id = s.id
      JOIN equipment e ON p.equipment_id = e.equipment_id
      JOIN users u ON p.reported_by = u.id
      WHERE p.equipment_id = ? 
      AND p.problem_type = ?
      AND p.status_id IN (${activeStatusIds.join(",")})
      AND p.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `,
      [equipmentId, problemType]
    );

    res.json({ success: true, problems });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการตรวจสอบปัญหาที่คล้ายกัน",
    });
  }
});

// When user wants to join existing problem, just show them reporter's name
router.post("/:id/join", auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Get problem and reporter info
    const [problem] = await connection.execute(
      `
      SELECT p.*, u.firstname, u.lastname 
      FROM problems p
      JOIN users u ON p.reported_by = u.id
      WHERE p.id = ?
    `,
      [req.params.id]
    );

    if (!problem[0]) {
      throw new Error("ไม่พบรายการแจ้งปัญหา");
    }

    // Instead of joining, show who reported
    res.json({
      success: true,
      message: `ปัญหานี้ถูกแจ้งโดย ${problem[0].firstname} ${problem[0].lastname} แล้ว`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาด",
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
