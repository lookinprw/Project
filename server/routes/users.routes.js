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
const VALID_ROLES = ["admin", "equipment_manager", "equipment_assistant", "reporter"];

const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

router.get("/", auth, async (req, res) => {
  try {
    let query = `
      SELECT id, username, firstname, lastname, role, branch 
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

router.get("/validate", auth, async (req, res) => {
  try {
    // Since auth middleware already validates the token,
    // if we reach here, the token is valid
    const [user] = await db.execute(
      "SELECT id, username, firstname, lastname, role, branch FROM users WHERE id = ?",
      [req.user.id]
    );

    if (user.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user: user[0]
    });
  } catch (error) {
    console.error("Validation error:", error);
    res.status(500).json({
      success: false,
      message: "Error validating user"
    });
  }
});



// Login route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกรหัสผู้ใช้และรหัสผ่าน",
      });
    }

    const [users] = await db.execute("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const user = users[0];

    // Try both methods - for compatibility during transition
    let passwordMatch = false;

    // First try direct comparison (for old passwords)
    if (password === user.password) {
      passwordMatch = true;
    } else {
      // Then try bcrypt comparison (for new hashed passwords)
      try {
        passwordMatch = await bcrypt.compare(password, user.password);
      } catch (error) {
        // If bcrypt.compare fails, it means the stored password isn't a hash
        passwordMatch = false;
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const accessToken = generateAccessToken(user);

    res.json({
      success: true,
      token: accessToken,
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
      user: updatedUser[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการอัพเดทข้อมูล"
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

router.post("/new", auth, checkRole(["admin", "equipment_manager"]), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { username, password, firstname, lastname, branch, role } = req.body;

    // Logging for debugging
    console.log("Received user data:", { username, firstname, lastname, branch, role });

    // Better validation check
    if (!username?.trim() || !password?.trim() || !firstname?.trim() || !lastname?.trim() || !branch?.trim() || !role?.trim()) {
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
      userId: result.insertId
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error creating user:", error);
    res.status(400).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้"
    });
  } finally {
    connection.release();
  }
});

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
        message: "ไม่พบผู้ใช้งาน"
      });
    }

    const user = rows[0];
    
    // Check if password is plain text or hashed
    let isValid;
    if (user.password.startsWith('$2')) {
      // Password is hashed with bcrypt
      isValid = await bcrypt.compare(currentPassword, user.password);
    } else {
      // Password is plain text
      isValid = currentPassword === user.password;
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "รหัสผ่านปัจจุบันไม่ถูกต้อง"
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await connection.execute(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, req.user.id]
    );

    res.json({
      success: true,
      message: "เปลี่ยนรหัสผ่านสำเร็จ"
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน"
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
