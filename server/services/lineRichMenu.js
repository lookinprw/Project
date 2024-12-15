const line = require("@line/bot-sdk");
const fs = require("fs");
const path = require("path");

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

const createRichMenu = async (force = false) => {
  try {
    console.log("Creating rich menu...");

    // Create rich menu
    const richMenu = {
      size: {
        width: 2500,
        height: 1686,
      },
      selected: true,
      name: "Rich Menu 1",
      chatBarText: "เมนู",
      areas: [
        {
          bounds: {
            x: 0,
            y: 0,
            width: 833,
            height: 843,
          },
          action: {
            type: "uri",
            label: "แจ้งปัญหา",
            uri: `${process.env.FRONTEND_URL}/login`,
            altUri: {
              // Add this for mobile
              desktop: `${process.env.FRONTEND_URL}/login`,
            },
          },
        },
        ,
        {
          bounds: {
            x: 834,
            y: 0,
            width: 833,
            height: 843,
          },
          action: {
            type: "message",
            label: "ดูสถานะ",
            text: "!status",
          },
        },
        {
          bounds: {
            x: 1667,
            y: 0,
            width: 833,
            height: 843,
          },
          action: {
            type: "message",
            label: "ดู ID",
            text: "!id",
          },
        },
        {
          bounds: {
            x: 0,
            y: 843,
            width: 1250,
            height: 843,
          },
          action: {
            type: "message",
            label: "ดูรายการปัญหา",
            text: "!problems",
          },
        },
        {
          bounds: {
            x: 1251,
            y: 843,
            width: 1249,
            height: 843,
          },
          action: {
            type: "message",
            label: "ช่วยเหลือ",
            text: "!help",
          },
        },
      ],
    };

    // Create rich menu
    const richMenuId = await client.createRichMenu(richMenu);
    console.log("Rich menu created:", richMenuId);

    // Upload rich menu image
    const imagePath = path.join(__dirname, "../assets/rich-menu.png");
    const bufferImage = fs.readFileSync(imagePath);
    await client.setRichMenuImage(richMenuId, bufferImage);
    console.log("Rich menu image uploaded");

    // Set as default rich menu
    await client.setDefaultRichMenu(richMenuId);
    console.log("Rich menu set as default");

    return richMenuId;
  } catch (error) {
    console.error("Error creating rich menu:", error);
    throw error;
  }
};

// Function to handle notifications when problem status changes
const sendStatusUpdateNotification = async (lineUserId, problem, newStatus) => {
  try {
    const statusText = {
      pending: "รอดำเนินการ",
      in_progress: "กำลังดำเนินการ",
      resolved: "เสร็จสิ้น",
    };

    await client.pushMessage(lineUserId, {
      type: "flex",
      altText: "อัพเดทสถานะปัญหา",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "อัพเดทสถานะปัญหา",
              weight: "bold",
              color: "#FFFFFF",
              size: "xl",
            },
          ],
          backgroundColor: "#4F46E5",
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `อุปกรณ์: ${problem.equipment_name}`,
              wrap: true,
              size: "md",
              margin: "md",
            },
            {
              type: "text",
              text: `สถานะ: ${statusText[newStatus] || newStatus}`,
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
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: {
                type: "uri",
                label: "ดูรายละเอียด",
                uri: `${process.env.FRONTEND_URL}/dashboard`,
              },
              style: "primary",
            },
          ],
        },
      },
    });
  } catch (error) {
    console.error("Error sending status update notification:", error);
  }
};

module.exports = {
  createRichMenu,
  sendStatusUpdateNotification,
};
