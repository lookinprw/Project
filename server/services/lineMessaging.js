// services/lineMessaging.js
const line = require("@line/bot-sdk");
require("dotenv").config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Role-specific content configurations
const ROLE_CONTENT = {
  admin: {
    headerText: "แจ้งปัญหาใหม่ (สำหรับผู้ดูแลระบบ)",
    color: "#4F46E5", // Indigo
    additionalInfo: [
      {
        type: "text",
        text: "กรุณาตรวจสอบและมอบหมายงาน",
        weight: "bold",
        color: "#4F46E5",
        margin: "md",
      },
    ],
  },
  equipment_manager: {
    headerText: "แจ้งปัญหาใหม่ (สำหรับผู้จัดการครุภัณฑ์)",
    color: "#059669", // Green
    additionalInfo: [
      {
        type: "text",
        text: "กรุณาตรวจสอบและดำเนินการแก้ไข",
        weight: "bold",
        color: "#059669",
        margin: "md",
      },
    ],
  },
  equipment_assistant: {
    headerText: "แจ้งปัญหาใหม่ (สำหรับผู้ช่วยดูแล)",
    color: "#0EA5E9", // Sky blue
    additionalInfo: [
      {
        type: "text",
        text: "โปรดรอการมอบหมายงานจากผู้จัดการ",
        weight: "bold",
        color: "#0EA5E9",
        margin: "md",
      },
    ],
  },
  student: {
    headerText: "สถานะการแจ้งปัญหา",
    color: "#6366F1", // Purple
    additionalInfo: [
      {
        type: "text",
        text: "เจ้าหน้าที่จะดำเนินการโดยเร็วที่สุด",
        weight: "bold",
        color: "#6366F1",
        margin: "md",
      },
    ],
  },
};

const STATUS_TEXT = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังดำเนินการ",
  resolved: "เสร็จสิ้น",
  cannot_fix: "ไม่สามารถแก้ไขได้",
};

const ROLE_MESSAGES = {
  admin: "อัพเดทสถานะปัญหา (ผู้ดูแลระบบ)",
  equipment_manager: "อัพเดทสถานะปัญหา (ผู้จัดการครุภัณฑ์)",
  equipment_assistant: "อัพเดทสถานะปัญหา (ผู้ช่วยดูแล)",
  student: "อัพเดทสถานะการแจ้งปัญหา",
};

const lineService = {
  client,
  config,

  // Helper to create basic message structure
  createBaseFlexMessage(headerText, color) {
    return {
      type: "flex",
      altText: headerText,
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: headerText,
              weight: "bold",
              size: "xl",
              color: "#FFFFFF",
            },
          ],
          backgroundColor: color,
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [],
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [],
        },
      },
    };
  },

  async sendProblemNotification(lineUserId, problem, userRole) {
    try {
      console.log(`Sending problem notification to ${lineUserId}`, {
        problem,
        userRole,
      });

      const roleContent = ROLE_CONTENT[userRole] || ROLE_CONTENT.student;
      const message = this.createBaseFlexMessage(
        roleContent.headerText,
        roleContent.color
      );

      // Add body contents
      message.contents.body.contents = [
        {
          type: "text",
          text: `อุปกรณ์: ${problem.equipment_name}`,
          wrap: true,
          size: "md",
          margin: "md",
        },
        {
          type: "text",
          text: `รหัส: ${problem.equipment_id}`,
          wrap: true,
          size: "md",
          margin: "md",
        },
        {
          type: "text",
          text: `ห้อง: ${problem.room || "N/A"}`,
          wrap: true,
          size: "md",
          margin: "md",
        },
        {
          type: "text",
          text: `รายละเอียด: ${problem.description}`,
          wrap: true,
          size: "sm",
          margin: "md",
          color: "#666666",
        },
        ...roleContent.additionalInfo,
      ];

      // Add footer button
      message.contents.footer.contents = [
        {
          type: "button",
          action: {
            type: "uri",
            label: "ดูรายละเอียด",
            uri: `${FRONTEND_URL}/dashboard`,
          },
          style: "primary",
          color: roleContent.color,
        },
      ];

      await client.pushMessage(lineUserId, message);
      console.log(`Successfully sent notification to ${lineUserId}`);
      return true;
    } catch (error) {
      console.error(`Error sending LINE notification to ${lineUserId}:`, error);
      throw error;
    }
  },

  async sendStatusUpdateNotification(lineUserId, problem, newStatus, userRole) {
    try {
      console.log(`Sending status update notification to ${lineUserId}`, {
        problem,
        newStatus,
        userRole,
      });

      const message = this.createBaseFlexMessage(
        ROLE_MESSAGES[userRole] || ROLE_MESSAGES.student,
        "#4F46E5"
      );

      // Build status-specific content
      const statusContent = [];
      if (userRole === "student") {
        if (newStatus === "in_progress") {
          statusContent.push({
            type: "text",
            text: "เจ้าหน้าที่กำลังดำเนินการแก้ไข",
            size: "sm",
            margin: "md",
            color: "#059669",
            weight: "bold",
          });
        } else if (newStatus === "resolved") {
          statusContent.push({
            type: "text",
            text: "การแก้ไขเสร็จสิ้น กรุณาตรวจสอบอุปกรณ์",
            size: "sm",
            margin: "md",
            color: "#059669",
            weight: "bold",
          });
        }
      }

      // Add body contents
      message.contents.body.contents = [
        {
          type: "text",
          text: `อุปกรณ์: ${problem.equipment_name}`,
          wrap: true,
          size: "md",
          margin: "md",
        },
        {
          type: "text",
          text: `สถานะ: ${STATUS_TEXT[newStatus] || newStatus}`,
          wrap: true,
          size: "md",
          margin: "md",
          weight: "bold",
        },
        {
          type: "text",
          text: problem.description,
          wrap: true,
          size: "sm",
          margin: "md",
          color: "#666666",
        },
        ...statusContent,
      ];

      // Add footer button
      message.contents.footer.contents = [
        {
          type: "button",
          action: {
            type: "uri",
            label: "ดูรายละเอียด",
            uri: `${FRONTEND_URL}/dashboard`,
          },
          style: "primary",
        },
      ];

      await client.pushMessage(lineUserId, message);
      console.log(
        `Successfully sent status update notification to ${lineUserId}`
      );
      return true;
    } catch (error) {
      console.error(`Error sending LINE notification to ${lineUserId}:`, error);
      throw error;
    }
  },
};

module.exports = lineService;
