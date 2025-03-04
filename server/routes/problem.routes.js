const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const express = require("express");
const router = express.Router();
const db = require("../config/db.config");
const multer = require("multer");
const { auth, checkRole } = require("../middleware/auth");
const uploadDir = path.join(__dirname, "../uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
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

    if (!validExt || !validMime) {
      return cb(new Error("เฉพาะไฟล์ .png, .jpg และ .jpeg เท่านั้น"), false);
    }
    cb(null, true);
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
             e.room as equipment_room, 
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
router.post("/", auth, async (req, res) => {
  // Handle file upload with error handling
  const uploadMiddleware = upload.single("image");

  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "File upload error",
      });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { equipment_id, description, problem_type } = req.body;
      const reported_by = req.user.id;

      // Validate inputs
      if (!equipment_id) {
        throw new Error("กรุณาระบุรหัสครุภัณฑ์");
      }

      if (!description || description.length < 5) {
        throw new Error("กรุณากรอกรายละเอียดปัญหาอย่างน้อย 5 ตัวอักษร");
      }

      // Validate problem_type
      const validTypes = ["hardware", "software", "other"];
      if (!problem_type || !validTypes.includes(problem_type)) {
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

      // Safely handle file info
      const imageFilename = req.file ? req.file.filename : null;

      const [result] = await connection.execute(
        `INSERT INTO problems (
          equipment_id, 
          description, 
          status_id, 
          image_url, 
          reported_by, 
          problem_type
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          equipment_id,
          description,
          defaultStatus[0].id,
          imageFilename,
          reported_by,
          problem_type,
        ]
      );

      await connection.commit();
      res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      await connection.rollback();

      // If there was a file uploaded but DB operation failed, remove the file
      if (req.file && req.file.filename) {
        const filePath = path.join(uploadDir, req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      res.status(500).json({
        success: false,
        message: error.message || "เกิดข้อผิดพลาดในการแจ้งปัญหา",
      });
    } finally {
      connection.release();
    }
  });
});

// Delete problem - fixed permission handling
router.delete("/:id", auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // First check if problem exists
    const [problems] = await connection.execute(
      "SELECT * FROM problems WHERE id = ?",
      [req.params.id]
    );

    if (problems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบรายการที่ต้องการลบ",
      });
    }

    const problem = problems[0];

    // Check permissions
    const hasPermission =
      req.user.role === "admin" ||
      req.user.role === "equipment_manager" ||
      (problem.reported_by &&
        parseInt(problem.reported_by) === parseInt(req.user.id));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions.",
      });
    }

    // Delete any associated images if they exist
    if (problem.image_url) {
      const imagePath = path.join(uploadDir, problem.image_url);
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
});

// Update problem status
router.patch("/:id/status", auth, async (req, res) => {
  const connection = await db.getConnection(); // Get the connection first

  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { status_id, comment } = req.body;

    if (!status_id) {
      throw new Error("กรุณาระบุสถานะ");
    }

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
      default:
        equipmentStatus = null;
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
      [status_id, comment || null, id]
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

// Update problem
router.put("/:id", auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { description, problem_type } = req.body;

    // Validate inputs
    if (!description || description.length < 5) {
      throw new Error("กรุณากรอกรายละเอียดปัญหาอย่างน้อย 5 ตัวอักษร");
    }

    // Validate problem_type
    const validTypes = ["hardware", "software", "other"];
    if (!problem_type || !validTypes.includes(problem_type)) {
      throw new Error("ประเภทปัญหาไม่ถูกต้อง");
    }

    // Get existing problem to check permissions
    const [problems] = await connection.execute(
      "SELECT * FROM problems WHERE id = ?",
      [id]
    );

    if (problems.length === 0) {
      throw new Error("ไม่พบรายการที่ต้องการแก้ไข");
    }

    const problem = problems[0];

    // Check permissions - admin, equipment_manager or own problem
    const hasPermission =
      req.user.role === "admin" ||
      req.user.role === "equipment_manager" ||
      (problem.reported_by &&
        parseInt(problem.reported_by) === parseInt(req.user.id));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions.",
      });
    }

    // Update problem
    await connection.execute(
      `UPDATE problems SET 
         description = ?, 
         problem_type = ?,
         updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [description, problem_type, id]
    );

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการแก้ไขรายการ",
    });
  } finally {
    connection.release();
  }
});

// Add or update this route in server/routes/problem.routes.js
// Make sure it's placed BEFORE any catch-all or generic routes

// Get history of completed assignments
// Get history of completed assignments for a specific user
// Add this new route to your problem.routes.js file

// Get history of completed assignments (ONLY status_id = 3)
router.get("/completed-history", auth, async (req, res) => {
  try {
    // Parse query parameters with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const assignedTo = req.query.assignedTo
      ? parseInt(req.query.assignedTo)
      : null;

    // Set up where clause - ONLY status_id = 3 (เสร็จสิ้น)
    let whereClause = "p.status_id = 3";
    let params = [];

    if (assignedTo) {
      whereClause += " AND p.assigned_to = ?";
      params.push(assignedTo);
    }

    // Add search filter if provided
    if (req.query.search) {
      whereClause += ` AND (
        e.equipment_id LIKE ? OR 
        e.name LIKE ? OR 
        p.description LIKE ? OR 
        CONCAT(u.firstname, ' ', u.lastname) LIKE ?
      )`;
      const searchPattern = `%${req.query.search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Add date filters if provided
    if (req.query.startDate) {
      whereClause += " AND DATE(p.updated_at) >= ?";
      params.push(req.query.startDate);
    }

    if (req.query.endDate) {
      whereClause += " AND DATE(p.updated_at) <= ?";
      params.push(req.query.endDate);
    }

    // Construct the query with LIMIT/OFFSET values directly in the SQL
    const query = `
      SELECT 
        p.*,
        e.name as equipment_name,
        e.equipment_id,
        e.room as equipment_room,
        s.name as status_name,
        s.color as status_color,
        CONCAT(u.firstname, ' ', u.lastname) as reporter_name,
        CONCAT(a.firstname, ' ', a.lastname) as assigned_to_name
      FROM 
        problems p
      LEFT JOIN 
        equipment e ON p.equipment_id = e.equipment_id
      LEFT JOIN 
        users u ON p.reported_by = u.id
      LEFT JOIN 
        users a ON p.assigned_to = a.id
      LEFT JOIN 
        status s ON p.status_id = s.id
      WHERE 
        ${whereClause}
      ORDER BY 
        p.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Count query for pagination
    const countQuery = `
      SELECT 
        COUNT(*) as total
      FROM 
        problems p
      LEFT JOIN 
        equipment e ON p.equipment_id = e.equipment_id
      LEFT JOIN 
        users u ON p.reported_by = u.id
      WHERE 
        ${whereClause}
    `;

    console.log("Query:", query);
    console.log("Parameters:", params);

    // Execute the queries
    const [results] = await db.query(query, params);
    const [countResult] = await db.query(countQuery, params);

    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: results,
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching completed assignments history:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการซ่อม",
      error: error.message,
    });
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

// Get unfixable problems PDF
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

      // PDF Constants
      const pageWidth = 842; // A4 landscape width
      const pageHeight = 595; // A4 landscape height
      const totalTableWidth = 750; // Total width of table
      const margin = (pageWidth - totalTableWidth) / 2; // Center margin
      const tableTop = 120;
      const rowHeight = 30;

      // Column definitions with centered positioning
      const columns = [
        { x: margin, width: 40, title: "ลำดับ" },
        { x: margin + 40, width: 110, title: "รหัสครุภัณฑ์" },
        { x: margin + 150, width: 120, title: "ชื่ออุปกรณ์" },
        { x: margin + 270, width: 80, title: "ห้อง" },
        { x: margin + 350, width: 120, title: "ปัญหา" },
        { x: margin + 470, width: 120, title: "เหตุผล" },
        { x: margin + 590, width: 80, title: "ผู้แจ้ง" },
        { x: margin + 670, width: 80, title: "ผู้รับผิดชอบ" },
      ];

      // Generate PDF
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: margin,
      });

      doc.registerFont(
        "Sarabun",
        path.join(__dirname, "../fonts/Sarabun-Regular.ttf")
      );
      doc.font("Sarabun");

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=unfixable_report_${Date.now()}.pdf`
      );
      doc.pipe(res);

      // Function to draw table header
      const drawTableHeader = (y) => {
        doc.lineWidth(1);

        // Header background
        doc
          .fillColor("#f3f4f6")
          .rect(margin, y, totalTableWidth, rowHeight)
          .fill()
          .fillColor("#000000");

        // Column titles
        columns.forEach((col) => {
          doc.fontSize(10).text(col.title, col.x + 2, y + 8, {
            width: col.width - 4,
            align: "center",
            lineGap: 0,
          });
        });

        // Vertical lines
        columns.forEach((col) => {
          doc
            .moveTo(col.x, y)
            .lineTo(col.x, y + rowHeight)
            .stroke();
        });

        // Last vertical line
        doc
          .moveTo(margin + totalTableWidth, y)
          .lineTo(margin + totalTableWidth, y + rowHeight)
          .stroke();

        // Horizontal lines
        doc
          .moveTo(margin, y)
          .lineTo(margin + totalTableWidth, y)
          .stroke()
          .moveTo(margin, y + rowHeight)
          .lineTo(margin + totalTableWidth, y + rowHeight)
          .stroke();
      };

      // Draw title and date
      doc.fontSize(20).text("รายงานครุภัณฑ์ที่ไม่สามารถซ่อมได้", 0, 40, {
        align: "center",
        width: pageWidth,
      });

      doc
        .fontSize(12)
        .text(`วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")}`, 0, 70, {
          align: "right",
          width: pageWidth - margin,
        });

      // Initialize pagination
      let currentPage = 1;
      let y = tableTop;

      // Draw initial header
      drawTableHeader(y);
      y += rowHeight;

      // Draw rows
      problems.forEach((problem, index) => {
        // New page check
        if (y > pageHeight - margin - rowHeight) {
          doc.addPage({ size: "A4", layout: "landscape", margin: margin });
          currentPage++;
          y = tableTop;
          drawTableHeader(y);
          y += rowHeight;
        }

        // Row background
        doc
          .fillColor(index % 2 === 0 ? "#ffffff" : "#f9fafb")
          .rect(margin, y, totalTableWidth, rowHeight)
          .fill()
          .fillColor("#000000");

        // Vertical lines
        columns.forEach((col) => {
          doc
            .moveTo(col.x, y)
            .lineTo(col.x, y + rowHeight)
            .stroke();
        });

        // Last vertical line
        doc
          .moveTo(margin + totalTableWidth, y)
          .lineTo(margin + totalTableWidth, y + rowHeight)
          .stroke();

        // Draw data
        doc.fontSize(8);

        // Index
        doc.text(String(index + 1), columns[0].x + 2, y + 8, {
          width: columns[0].width - 4,
          align: "center",
        });

        // Equipment ID
        doc.text(problem.equipment_id || "", columns[1].x + 2, y + 8, {
          width: columns[1].width - 4,
          align: "left",
        });

        // Equipment name
        doc.text(problem.equipment_name || "", columns[2].x + 2, y + 8, {
          width: columns[2].width - 4,
          align: "left",
        });

        // Room
        doc.text(problem.equipment_room || "", columns[3].x + 2, y + 8, {
          width: columns[3].width - 4,
          align: "center",
        });

        // Problem description
        doc.text(problem.description || "", columns[4].x + 2, y + 8, {
          width: columns[4].width - 4,
          align: "left",
        });

        // Comment
        doc.text(problem.comment || "", columns[5].x + 2, y + 8, {
          width: columns[5].width - 4,
          align: "left",
        });

        // Reporter
        doc.text(problem.reporter_name || "", columns[6].x + 2, y + 8, {
          width: columns[6].width - 4,
          align: "center",
        });

        // Assignee
        doc.text(problem.assigned_to_name || "-", columns[7].x + 2, y + 8, {
          width: columns[7].width - 4,
          align: "center",
        });

        // Bottom line of row
        doc
          .moveTo(margin, y + rowHeight)
          .lineTo(margin + totalTableWidth, y + rowHeight)
          .stroke();

        y += rowHeight;
      });

      // Page numbers
      let pages = currentPage;
      for (let i = 1; i <= pages; i++) {
        doc.switchToPage(i - 1);
        doc
          .fontSize(8)
          .text(`หน้า ${i} จาก ${pages}`, 0, pageHeight - margin - 15, {
            align: "right",
            width: pageWidth - margin,
          });
      }

      // Finalize PDF
      doc.end();
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("Error:", error);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ success: false, message: "Error generating PDF" });
      }
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

router.get("/paginated", auth, async (req, res) => {
  try {
    // Basic pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    // Get search parameters
    const search = req.query.search || "";
    const statusFilters = req.query.status
      ? Array.isArray(req.query.status)
        ? req.query.status
        : [req.query.status]
      : [];
    const typeFilters = req.query.type
      ? Array.isArray(req.query.type)
        ? req.query.type
        : [req.query.type]
      : [];

    // Build the conditions
    let conditions = ["1=1"]; // Always true condition to start the WHERE clause
    let params = [];

    // Add role-based filtering
    if (req.user.role === "reporter") {
      conditions.push("p.reported_by = ?");
      params.push(req.user.id);
    } else if (req.user.role === "equipment_assistant") {
      conditions.push(
        "(p.status_id = 1 OR (p.status_id = 2 AND p.assigned_to = ?) OR p.reported_by = ?)"
      );
      params.push(req.user.id, req.user.id);
    }

    // Add search filters
    if (search) {
      conditions.push(
        "(e.equipment_id LIKE ? OR e.name LIKE ? OR p.description LIKE ? OR CONCAT(u.firstname, ' ', u.lastname) LIKE ?)"
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Add status filters
    if (statusFilters.length > 0) {
      conditions.push(
        `p.status_id IN (${statusFilters.map(() => "?").join(",")})`
      );
      params.push(...statusFilters);
    }

    // Add type filters
    if (typeFilters.length > 0) {
      conditions.push(
        `p.problem_type IN (${typeFilters.map(() => "?").join(",")})`
      );
      params.push(...typeFilters);
    }

    // Build the WHERE clause
    const whereClause = conditions.join(" AND ");

    // Build the main query
    const baseQuery = `
      SELECT p.*, 
             e.name as equipment_name,   
             e.equipment_id,             
             e.status as equipment_status,
             e.room as equipment_room, 
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
      WHERE ${whereClause}
      ORDER BY p.created_at DESC 
    `;

    // Execute the count query (without LIMIT and OFFSET)
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM problems p
      LEFT JOIN equipment e ON p.equipment_id = e.equipment_id
      LEFT JOIN users u ON p.reported_by = u.id
      WHERE ${whereClause}
    `;

    // Execute data query with pagination
    const dataQuery = baseQuery + ` LIMIT ${limit} OFFSET ${offset}`;

    // Execute both queries
    const [problemsResult] = await db.query(dataQuery, params);
    const [countResult] = await db.query(countQuery, params);

    // Calculate total pages
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: problemsResult,
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching paginated problems:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
      error: error.message,
    });
  }
});

// Get problem details by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const [problems] = await db.execute(
      `
      SELECT p.*,
             e.name as equipment_name,
             e.equipment_id,
             e.status as equipment_status,
             e.room as equipment_room,
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
      WHERE p.id = ?
    `,
      [req.params.id]
    );

    if (problems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบรายการที่ต้องการ",
      });
    }

    // Check if the user has permission to view this problem
    const problem = problems[0];
    const hasPermission =
      req.user.role === "admin" ||
      req.user.role === "equipment_manager" ||
      req.user.role === "equipment_assistant" ||
      (problem.reported_by &&
        parseInt(problem.reported_by) === parseInt(req.user.id));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions.",
      });
    }

    res.json({
      success: true,
      data: problem,
    });
  } catch (error) {
    console.error("Error fetching problem details:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
      error: error.message,
    });
  }
});

// Get image
router.get("/image/:filename", auth, async (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(uploadDir, filename);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบรูปภาพ",
      });
    }

    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = "image/jpeg";

    if (ext === ".png") {
      contentType = "image/png";
    } else if (ext === ".jpg" || ext === ".jpeg") {
      contentType = "image/jpeg";
    }

    res.setHeader("Content-Type", contentType);

    // Stream the file
    const fileStream = fs.createReadStream(imagePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงรูปภาพ",
    });
  }
});

// Get monthly statistics - for dashboard
// Add these routes to your problem.routes.js file

// Get monthly statistics with filter support
router.get(
  "/stats/monthly",
  auth,
  checkRole(["admin", "equipment_manager"]),
  async (req, res) => {
    try {
      // Extract filter parameters
      const { startDate, endDate, problemType, room, statusId } = req.query;

      // Build the WHERE clause dynamically
      let whereConditions = [];
      let params = [];

      // Date range filter
      if (startDate && endDate) {
        whereConditions.push(
          "p.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)"
        );
        params.push(startDate, endDate);
      } else if (startDate) {
        whereConditions.push("p.created_at >= ?");
        params.push(startDate);
      } else if (endDate) {
        whereConditions.push("p.created_at <= DATE_ADD(?, INTERVAL 1 DAY)");
        params.push(endDate);
      } else {
        // Default to last 6 months if no date range specified
        whereConditions.push(
          "p.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)"
        );
      }

      // Problem type filter
      if (problemType && problemType !== "all") {
        whereConditions.push("p.problem_type = ?");
        params.push(problemType);
      }

      // Room filter
      if (room && room !== "all") {
        whereConditions.push("e.room = ?");
        params.push(room);
      }

      // Status filter
      if (statusId && statusId !== "all") {
        whereConditions.push("p.status_id = ?");
        params.push(statusId);
      }

      // Combine all conditions
      const whereClause = whereConditions.length
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

      // Build the query with filters
      const query = `
        SELECT 
          YEAR(p.created_at) as year,
          MONTH(p.created_at) as month,
          COUNT(*) as total,
          SUM(CASE WHEN p.status_id = 3 THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN p.status_id = 4 THEN 1 ELSE 0 END) as unfixable,
          SUM(CASE WHEN p.problem_type = 'hardware' THEN 1 ELSE 0 END) as hardware,
          SUM(CASE WHEN p.problem_type = 'software' THEN 1 ELSE 0 END) as software,
          SUM(CASE WHEN p.problem_type = 'other' THEN 1 ELSE 0 END) as other
        FROM problems p
        LEFT JOIN equipment e ON p.equipment_id = e.equipment_id
        ${whereClause}
        GROUP BY YEAR(p.created_at), MONTH(p.created_at)
        ORDER BY YEAR(p.created_at) DESC, MONTH(p.created_at) DESC
        LIMIT 6
      `;

      const [results] = await db.query(query, params);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error("Error fetching monthly statistics:", error);
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลสถิติรายเดือน",
        error: error.message,
      });
    }
  }
);

// Get room statistics with filter support
// Add this to your server's problem.routes.js file to ensure all charts respect your filters:

// Update the rooms statistics endpoint to respect status filters
router.get(
  "/stats/rooms",
  auth,
  checkRole(["admin", "equipment_manager"]),
  async (req, res) => {
    try {
      // Extract filter parameters
      const { startDate, endDate, type, room, search, status } = req.query;

      // Build the WHERE clause dynamically
      let whereConditions = [];
      let params = [];

      // Date range filter
      if (startDate && endDate) {
        whereConditions.push(
          "p.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)"
        );
        params.push(startDate, endDate);
      } else if (startDate) {
        whereConditions.push("p.created_at >= ?");
        params.push(startDate);
      } else if (endDate) {
        whereConditions.push("p.created_at <= DATE_ADD(?, INTERVAL 1 DAY)");
        params.push(endDate);
      }

      // Problem type filter - handle arrays
      if (type && type.length) {
        const types = Array.isArray(type) ? type : [type];
        if (types.length > 0) {
          whereConditions.push(
            `p.problem_type IN (${types.map(() => "?").join(",")})`
          );
          params.push(...types);
        }
      }

      // Room filter - handle arrays
      if (room && room.length) {
        const rooms = Array.isArray(room) ? room : [room];
        if (rooms.length > 0) {
          whereConditions.push(`e.room IN (${rooms.map(() => "?").join(",")})`);
          params.push(...rooms);
        }
      }

      // Status filter - handle arrays
      if (status && status.length) {
        const statuses = Array.isArray(status) ? status : [status];
        if (statuses.length > 0) {
          whereConditions.push(
            `p.status_id IN (${statuses.map(() => "?").join(",")})`
          );
          params.push(...statuses);
        }
      }

      // Search filter
      if (search) {
        whereConditions.push(
          "(e.equipment_id LIKE ? OR e.name LIKE ? OR p.description LIKE ?)"
        );
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // Combine all conditions
      const whereClause = whereConditions.length
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

      // Build the query with filters
      const query = `
        SELECT 
          e.room,
          COUNT(*) as total,
          SUM(CASE WHEN p.problem_type = 'hardware' THEN 1 ELSE 0 END) as hardware,
          SUM(CASE WHEN p.problem_type = 'software' THEN 1 ELSE 0 END) as software
        FROM problems p
        JOIN equipment e ON p.equipment_id = e.equipment_id
        ${whereClause}
        GROUP BY e.room
        ORDER BY total DESC
        LIMIT 10
      `;

      console.log("Room stats query:", query);
      console.log("Room stats params:", params);

      const [results] = await db.query(query, params);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error("Error fetching room statistics:", error);
      res.status(500).json({
        success: false,
        message: "เกิดข้อมูลข้อมูลสถิติตามห้อง",
        error: error.message,
      });
    }
  }
);

// Update the /stats/summary endpoint to respect all filters
router.get("/stats/summary", auth, async (req, res) => {
  try {
    // Extract filter parameters
    const { startDate, endDate, type, room, search, status } = req.query;

    // Build filter conditions for the JOIN
    let whereConditions = [];
    let params = [];

    // Permission filter based on user role
    if (req.user.role === "reporter") {
      whereConditions.push("p.reported_by = ?");
      params.push(req.user.id);
    } else if (req.user.role === "equipment_assistant") {
      whereConditions.push(
        "(p.status_id = 1 OR p.assigned_to = ? OR p.reported_by = ?)"
      );
      params.push(req.user.id, req.user.id);
    }

    // Date range filter
    if (startDate && endDate) {
      whereConditions.push(
        "p.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)"
      );
      params.push(startDate, endDate);
    } else if (startDate) {
      whereConditions.push("p.created_at >= ?");
      params.push(startDate);
    } else if (endDate) {
      whereConditions.push("p.created_at <= DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(endDate);
    }

    // Problem type filter - handle arrays
    if (type && type.length) {
      const types = Array.isArray(type) ? type : [type];
      if (types.length > 0) {
        whereConditions.push(
          `p.problem_type IN (${types.map(() => "?").join(",")})`
        );
        params.push(...types);
      }
    }

    // Room filter - handle arrays
    if (room && room.length) {
      const rooms = Array.isArray(room) ? room : [room];
      if (rooms.length > 0) {
        whereConditions.push(`e.room IN (${rooms.map(() => "?").join(",")})`);
        params.push(...rooms);
      }
    }

    // Status filter is not applied here since we're counting by status

    // Search filter
    if (search) {
      whereConditions.push(
        "(e.equipment_id LIKE ? OR e.name LIKE ? OR p.description LIKE ?)"
      );
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Combine conditions
    const whereClause = whereConditions.length
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // Modified query with joined equipment table for room filtering
    const query = `
      SELECT 
        s.id as status_id,
        s.name as status_name,
        s.color as status_color,
        COUNT(p.id) as count
      FROM status s
      LEFT JOIN problems p ON s.id = p.status_id
      LEFT JOIN equipment e ON p.equipment_id = e.equipment_id
      ${whereClause}
      GROUP BY s.id, s.name, s.color
      ORDER BY s.id
    `;

    // Count total problems with filters
    const countQuery = `
      SELECT COUNT(p.id) as total
      FROM problems p
      LEFT JOIN equipment e ON p.equipment_id = e.equipment_id
      ${whereClause}
    `;

    console.log("Summary query:", query);
    console.log("Summary params:", params);

    const [statusResults] = await db.query(query, params);
    const [totalResult] = await db.query(countQuery, params);

    res.json({
      success: true,
      data: {
        statuses: statusResults,
        total: totalResult[0].total || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching status summary:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลสรุป",
      error: error.message,
    });
  }
});
module.exports = router;
