const express = require("express");
const router = express.Router();
const db = require("../config/db.config");
const {
  auth,
  checkRole,
  generateAccessToken,
  generateRefreshToken,
} = require("../middleware/auth");
const bcrypt = require("bcrypt");
const VALID_ROLES = [
  "admin",
  "equipment_manager",
  "equipment_assistant",
  "reporter",
];

const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

router.get("/", auth, async (req, res) => {
  try {
    let query = `
      SELECT id, username, firstname, lastname, role, branch, status 
      FROM users
    `;
    const queryParams = [];

    if (req.query.role) {
      const roles = Array.isArray(req.query.role)
        ? req.query.role
        : [req.query.role];
      query += ` AND role IN (${roles.map(() => "?").join(",")})`;
      queryParams.push(...roles);
    }

    query += ` ORDER BY role DESC, firstname ASC`;
    const [users] = await db.execute(query, queryParams);

    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลผู้ใช้งานได้",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
      return res.status(400).send({
        success: false,
        type: "error",
        message: "กรุณากรอกรหัสผู้ใช้และรหัสผ่าน",
      });
    }

    // Find user
    const [users] = await db.execute("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    // User not found
    if (users.length === 0) {
      return res.status(200).send({
        success: false,
        type: "error",
        message: "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const user = users[0];

    // Check if user account is inactive
    if (user.status === "inactive") {
      return res.status(200).send({
        success: false,
        type: "error",
        message: "บัญชีผู้ใช้นี้ถูกระงับการใช้งาน โปรดติดต่อผู้ดูแลระบบ",
      });
    }

    let passwordMatch = false;

    // Password verification
    if (user.password.startsWith("$2")) {
      try {
        passwordMatch = await bcrypt.compare(password, user.password);
      } catch (error) {
        console.error("Password compare error:", error);
        passwordMatch = false;
      }
    } else {
      passwordMatch = password === user.password;
    }

    // Wrong password
    if (!passwordMatch) {
      return res.status(200).send({
        success: false,
        type: "error",
        message: "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Success response
    return res.status(200).send({
      success: true,
      type: "success",
      message: "เข้าสู่ระบบสำเร็จ",
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        branch: user.branch,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(200).send({
      success: false,
      type: "error",
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง",
    });
  }
});

// Register route
router.post("/register", async (req, res) => {
  try {
    const { username, password, firstname, lastname, branch } = req.body;

    // Input validation remains the same
    if (!username || !password || !firstname || !lastname || !branch) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลให้ครบถ้วน",
      });
    }

    // Check for existing user
    const [existingUsers] = await db.execute(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "รหัสผู้ใช้นี้มีในระบบแล้ว",
      });
    }

    // Password length validation

    // Hash the password before saving
    const hashedPassword = await hashPassword(password);

    // Save user with hashed password
    await db.execute(
      "INSERT INTO users (username, password, firstname, lastname, role, branch) VALUES (?, ?, ?, ?, ?, ?)",
      [username, hashedPassword, firstname, lastname, "reporter", branch]
    );

    res.json({
      success: true,
      message: "ลงทะเบียนสำเร็จ",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการลงทะเบียน",
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
router.patch("/:id", auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { firstname, lastname, branch } = req.body;

    // Verify user exists first
    const [userExists] = await connection.execute(
      "SELECT id FROM users WHERE id = ?",
      [id]
    );

    if (userExists.length === 0) {
      throw new Error("ไม่พบผู้ใช้งาน");
    }

    // Update user info
    await connection.execute(
      `UPDATE users 
       SET firstname = ?, 
           lastname = ?, 
           branch = ?, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [firstname, lastname, branch, id]
    );

    // Get updated user data
    const [updatedUser] = await connection.execute(
      `SELECT id, username, firstname, lastname, role, branch 
       FROM users WHERE id = ?`,
      [id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "อัพเดทข้อมูลสำเร็จ",
      user: updatedUser[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการอัพเดทข้อมูล",
    });
  } finally {
    connection.release();
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

// Add this endpoint to your user.routes.js file

// Update user status (active/inactive)
// First, let's fix the status change endpoint in user.routes.js

router.patch("/:id/status", auth, async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status } = req.body;

    console.log(`Attempting to update user ID ${id} status to: "${status}"`);

    // Validate status
    if (status !== "active" && status !== "inactive") {
      console.log(`Invalid status value: "${status}"`);
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `สถานะไม่ถูกต้อง (must be 'active' or 'inactive', received '${status}')`,
      });
    }

    // Prevent self-status change
    if (parseInt(id) === req.user.id) {
      console.log(`User ${req.user.id} attempted to change their own status`);
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "ไม่สามารถเปลี่ยนสถานะของตัวเองได้",
      });
    }

    // Check if user exists and get their role
    const [targetUser] = await connection.execute(
      "SELECT id, username, role, status FROM users WHERE id = ?",
      [id]
    );

    console.log(`Found user:`, targetUser[0] || "No user found");

    if (targetUser.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "ไม่พบผู้ใช้งานนี้ในระบบ",
      });
    }

    // Check permissions based on role
    if (
      req.user.role === "equipment_manager" &&
      (targetUser[0].role === "admin" ||
        targetUser[0].role === "equipment_manager")
    ) {
      console.log(
        `Permission denied for ${req.user.role} to modify ${targetUser[0].role}`
      );
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์ในการเปลี่ยนสถานะผู้ใช้นี้",
      });
    }

    // Only admin and equipment_manager can change user status
    if (!["admin", "equipment_manager"].includes(req.user.role)) {
      console.log(`User role ${req.user.role} not authorized to change status`);
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์ในการเปลี่ยนสถานะผู้ใช้งาน",
      });
    }

    // First check current status
    console.log(
      `Current status in DB for user ${id}: "${targetUser[0].status}"`
    );

    // Skip update if status is already set to the requested value
    if (targetUser[0].status === status) {
      console.log(
        `User ${id} already has status "${status}" - skipping update`
      );
      await connection.commit();
      return res.json({
        success: true,
        message: `สถานะผู้ใช้เป็น ${
          status === "active" ? "กำลังใช้งาน" : "ยุติการใช้งาน"
        } อยู่แล้ว`,
        user: {
          id: targetUser[0].id,
          username: targetUser[0].username,
          status: status,
        },
      });
    }

    // Update user status - execute directly to see the error if any
    try {
      // Use a more explicit SQL query
      const query =
        "UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?";
      const params = [status, id];

      console.log(`Executing SQL: ${query} with params:`, params);

      const [updateResult] = await connection.execute(query, params);

      console.log(`Update result:`, updateResult);

      if (updateResult.affectedRows === 0) {
        throw new Error(`No rows updated for user ID ${id}`);
      }
    } catch (sqlError) {
      console.error(`SQL Error:`, sqlError);
      throw new Error(`Database error: ${sqlError.message}`);
    }

    // Verify the update happened
    const [verifyUpdate] = await connection.execute(
      "SELECT id, username, status FROM users WHERE id = ?",
      [id]
    );

    console.log(`Verification after update:`, verifyUpdate[0]);

    if (verifyUpdate.length === 0 || verifyUpdate[0].status !== status) {
      throw new Error(`Update verification failed for user ID ${id}`);
    }

    await connection.commit();
    console.log(`Successfully updated user ${id} status to "${status}"`);

    res.json({
      success: true,
      message: `เปลี่ยนสถานะผู้ใช้เป็น ${
        status === "active" ? "กำลังใช้งาน" : "ยุติการใช้งาน"
      } สำเร็จ`,
      user: {
        id: targetUser[0].id,
        username: targetUser[0].username,
        status: status,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating user status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะผู้ใช้งาน",
    });
  } finally {
    connection.release();
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT id, username, firstname, lastname, role, branch 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลผู้ใช้",
      });
    }

    const user = users[0];

    // Generate fresh tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      user,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลผู้ใช้งานได้",
    });
  }
});

// Replace your existing refresh-token endpoint with this one

router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Get fresh user data
    const [users] = await db.execute(
      `SELECT id, username, firstname, lastname, role, branch 
       FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        branch: user.branch,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
});

router.post(
  "/new",
  auth,
  checkRole(["admin", "equipment_manager"]),
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const { username, password, firstname, lastname, branch, role } =
        req.body;

      // Logging for debugging
      console.log("Received user data:", {
        username,
        firstname,
        lastname,
        branch,
        role,
      });

      // Better validation check
      if (
        !username?.trim() ||
        !password?.trim() ||
        !firstname?.trim() ||
        !lastname?.trim() ||
        !branch?.trim() ||
        !role?.trim()
      ) {
        throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
      }

      // Check existing user
      const [existingUsers] = await connection.execute(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );

      if (existingUsers.length > 0) {
        throw new Error("รหัสผู้ใช้นี้มีในระบบแล้ว");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      const [result] = await connection.execute(
        "INSERT INTO users (username, password, firstname, lastname, role, branch) VALUES (?, ?, ?, ?, ?, ?)",
        [username, hashedPassword, firstname, lastname, role, branch]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: "เพิ่มผู้ใช้สำเร็จ",
        userId: result.insertId,
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error creating user:", error);
      res.status(400).json({
        success: false,
        message: error.message || "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้",
      });
    } finally {
      connection.release();
    }
  }
);

router.post(
  "/admin-reset-password",
  auth,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { username, newPassword } = req.body;

      // First check if user exists
      const [users] = await db.execute(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบบัญชีผู้ใช้นี้",
        });
      }

      // Hash the new password before saving
      const hashedPassword = await hashPassword(newPassword);

      // Update with hashed password
      await db.execute("UPDATE users SET password = ? WHERE id = ?", [
        hashedPassword,
        users[0].id,
      ]);

      res.json({
        success: true,
        message: "รีเซ็ตรหัสผ่านสำเร็จ",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน",
      });
    }
  }
);

router.post("/change-password", auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { currentPassword, newPassword } = req.body;
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบผู้ใช้งาน",
      });
    }

    const user = rows[0];

    // Check if password is plain text or hashed
    let isValid;
    if (user.password.startsWith("$2")) {
      // Password is hashed with bcrypt
      isValid = await bcrypt.compare(currentPassword, user.password);
    } else {
      // Password is plain text
      isValid = currentPassword === user.password;
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await connection.execute("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      req.user.id,
    ]);

    res.json({
      success: true,
      message: "เปลี่ยนรหัสผ่านสำเร็จ",
    });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน",
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
