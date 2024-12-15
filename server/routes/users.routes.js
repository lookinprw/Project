// routes/users.routes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db.config");
const {
  auth,
  checkRole,
  generateAccessToken,
  generateRefreshToken,
} = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  try {
    let query = `
      SELECT id, student_id, firstname, lastname, role, branch 
      FROM users 
      WHERE 1=1
    `;

    const queryParams = [];

    // Filter by role if specified
    if (req.query.role) {
      const roles = Array.isArray(req.query.role)
        ? req.query.role
        : [req.query.role];
      query += ` AND role IN (${roles.map(() => "?").join(",")})`;
      queryParams.push(...roles);
    }

    query += ` ORDER BY role DESC, firstname ASC`;

    const [users] = await db.execute(query, queryParams);

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลผู้ใช้งานได้",
    });
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const { student_id, password } = req.body;

    // Validate input
    if (!student_id || !password) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกรหัสนักศึกษาและรหัสผ่าน",
      });
    }

    // Get user from database
    const [users] = await db.execute(
      "SELECT * FROM users WHERE student_id = ?",
      [student_id]
    );

    // Check if user exists and password matches
    if (users.length === 0 || password !== users[0].password) {
      return res.status(401).json({
        success: false,
        message: "รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const user = users[0];

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in database
    await db.execute("UPDATE users SET refresh_token = ? WHERE id = ?", [
      refreshToken,
      user.id,
    ]);

    // Send response with tokens and user data
    res.json({
      success: true,
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        student_id: user.student_id,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        branch: user.branch,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
    });
  }
});

// Register route
router.post("/register", async (req, res) => {
  try {
    const { student_id, password, firstname, lastname, branch } = req.body;

    // Validate input
    if (!student_id || !password || !firstname || !lastname || !branch) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลให้ครบถ้วน",
      });
    }

    // Validate student ID format
    if (!/^\d{8}$/.test(student_id)) {
      return res.status(400).json({
        success: false,
        message: "รหัสนักศึกษาต้องเป็นตัวเลข 8 หลักเท่านั้น",
      });
    }

    // Check existing user
    const [existingUsers] = await db.execute(
      "SELECT id FROM users WHERE student_id = ?",
      [student_id]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "รหัสนักศึกษานี้มีในระบบแล้ว",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    await db.execute(
      "INSERT INTO users (student_id, password, firstname, lastname, role, branch) VALUES (?, ?, ?, ?, ?, ?)",
      [student_id, hashedPassword, firstname, lastname, "student", branch]
    );

    res.status(201).json({
      success: true,
      message: "ลงทะเบียนสำเร็จ",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง",
    });
  }
});

// Update user role (admin only)
router.patch("/:id/role", auth, checkRole(["admin"]), async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "สิทธิ์การใช้งานไม่ถูกต้อง",
      });
    }

    // Prevent self-role change
    if (parseInt(id) === req.user.id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้",
      });
    }

    await connection.execute("UPDATE users SET role = ? WHERE id = ?", [
      role,
      id,
    ]);

    await connection.commit();

    res.json({
      success: true,
      message: "อัพเดทสิทธิ์การใช้งานสำเร็จ",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating role:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการอัพเดทสิทธิ์การใช้งาน",
    });
  } finally {
    connection.release();
  }
});

// Update LINE user ID
router.patch("/:id/line", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { line_user_id } = req.body;

    console.log(`Updating LINE ID for user ${id}:`, line_user_id);

    // Validate input
    if (!line_user_id) {
      return res.status(400).json({
        success: false,
        message: "LINE User ID is required",
      });
    }

    // Update user
    const [result] = await db.query(
      "UPDATE users SET line_user_id = ?, updated_at = NOW() WHERE id = ?",
      [line_user_id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fetch updated user data
    const [rows] = await db.query(
      "SELECT id, student_id, firstname, lastname, role, line_user_id FROM users WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "LINE User ID updated successfully",
      user: rows[0],
    });
  } catch (error) {
    console.error("Error updating LINE User ID:", error);
    res.status(500).json({
      success: false,
      message: "Error updating LINE User ID",
      error: error.message,
    });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch user data
    const [users] = await db.execute(
      `SELECT id, student_id, firstname, lastname, role, branch, line_user_id, 
       created_at, updated_at 
       FROM users WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบผู้ใช้งาน",
      });
    }

    // Only allow users to view their own profile or admins to view any profile
    if (req.user.role !== "admin" && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล",
      });
    }

    res.json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้",
    });
  }
});

// Delete user
router.delete("/:id", auth, async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Check if user exists and get their role
    const [targetUser] = await connection.execute(
      "SELECT role FROM users WHERE id = ?",
      [id]
    );

    if (targetUser.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "ไม่พบผู้ใช้งานนี้ในระบบ",
      });
    }

    // Don't allow self-deletion
    if (parseInt(id) === req.user.id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "ไม่สามารถลบบัญชีของตัวเองได้",
      });
    }

    // Check permissions based on role
    if (
      req.user.role === "equipment_manager" &&
      targetUser[0].role === "admin"
    ) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์ในการลบผู้ดูแลระบบ",
      });
    }

    // Only admin and equipment_manager can delete users
    if (!["admin", "equipment_manager"].includes(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์ในการลบผู้ใช้งาน",
      });
    }

    // Update problems to set reported_by to NULL
    await connection.execute(
      "UPDATE problems SET reported_by = NULL WHERE reported_by = ?",
      [id]
    );

    // Delete the user
    await connection.execute("DELETE FROM users WHERE id = ?", [id]);

    await connection.commit();

    res.json({
      success: true,
      message: "ลบผู้ใช้งานสำเร็จ",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการลบผู้ใช้งาน",
    });
  } finally {
    connection.release();
  }
});

router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // First verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Then verify it exists in database
    const [users] = await db.execute(
      "SELECT * FROM users WHERE refresh_token = ?",
      [refreshToken]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const user = users[0];

    // Verify user matches token
    if (decoded.id !== user.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update refresh token in database
    await db.execute("UPDATE users SET refresh_token = ? WHERE id = ?", [
      newRefreshToken,
      user.id,
    ]);

    res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
});

module.exports = router;
