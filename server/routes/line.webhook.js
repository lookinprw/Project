const express = require("express");
const router = express.Router();
const line = require("@line/bot-sdk");

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// Test route
router.get("/test", (req, res) => {
  res.json({
    status: "ok",
    config: {
      hasAccessToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
      hasSecret: !!process.env.LINE_CHANNEL_SECRET,
      frontendUrl: process.env.FRONTEND_URL,
    },
  });
});

// Webhook route
router.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    console.log("Received webhook events:", JSON.stringify(events, null, 2));

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const { text } = event.message;
        const userId = event.source.userId;

        switch (text.toLowerCase()) {
          case "!id":
            await client.replyMessage(event.replyToken, {
              type: "text",
              text: `รหัส LINE ของคุณคือ: ${userId}\n\nคุณสามารถนำรหัสนี้ไปผูกกับบัญชีในระบบได้`,
              quickReply: {
                items: [
                  {
                    type: "action",
                    action: {
                      type: "uri",
                      label: "ไปที่หน้าโปรไฟล์",
                      uri: `${process.env.FRONTEND_URL}/profile`,
                    },
                  },
                ],
              },
            });
            break;

          case "!status":
            await client.replyMessage(event.replyToken, {
              type: "text",
              text:
                "คุณสามารถตรวจสอบสถานะได้ที่เว็บไซต์\n\nกรุณาเข้าสู่ระบบผ่านคอมพิวเตอร์ที่:\n" +
                process.env.FRONTEND_URL,
              quickReply: {
                items: [
                  {
                    type: "action",
                    action: {
                      type: "uri",
                      label: "เปิดในเบราว์เซอร์",
                      uri: `${process.env.FRONTEND_URL}/login`,
                    },
                  },
                ],
              },
            });
            break;

          case "!web":
            await client.replyMessage(event.replyToken, {
              type: "text",
              text:
                "เพื่อการใช้งานที่ดีที่สุด กรุณาใช้งานผ่านคอมพิวเตอร์ที่:\n\n" +
                process.env.FRONTEND_URL +
                "\n\nหากใช้งานผ่านมือถือ กรุณาเปิดลิงก์ในเบราว์เซอร์",
              quickReply: {
                items: [
                  {
                    type: "action",
                    action: {
                      type: "uri",
                      label: "เปิดในเบราว์เซอร์",
                      uri: `${process.env.FRONTEND_URL}/login`,
                    },
                  },
                ],
              },
            });
            break;

          case "!problems":
            await client.replyMessage(event.replyToken, {
              type: "text",
              text:
                "คุณสามารถดูรายการแจ้งปัญหาได้ที่เว็บไซต์\n\nกรุณาเข้าสู่ระบบผ่านคอมพิวเตอร์ที่:\n" +
                process.env.FRONTEND_URL,
              quickReply: {
                items: [
                  {
                    type: "action",
                    action: {
                      type: "uri",
                      label: "เปิดในเบราว์เซอร์",
                      uri: `${process.env.FRONTEND_URL}/login`,
                    },
                  },
                ],
              },
            });
            break;

          case "!help":
            await client.replyMessage(event.replyToken, {
              type: "text",
              text:
                "คำสั่งที่สามารถใช้ได้:\n\n" +
                "!id - ดูรหัส LINE ของคุณ\n" +
                "!status - ดูสถานะการแจ้งปัญหา\n" +
                "!problems - ดูรายการแจ้งปัญหาทั้งหมด\n" +
                "!web - วิธีเข้าใช้งานเว็บไซต์\n\n" +
                "แนะนำให้ใช้งานผ่านคอมพิวเตอร์ที่:\n" +
                process.env.FRONTEND_URL,
              quickReply: {
                items: [
                  {
                    type: "action",
                    action: {
                      type: "message",
                      label: "ดู ID",
                      text: "!id",
                    },
                  },
                  {
                    type: "action",
                    action: {
                      type: "uri",
                      label: "เปิดเว็บไซต์",
                      uri: `${process.env.FRONTEND_URL}/login`,
                    },
                  },
                ],
              },
            });
            break;
        }
      }
    }

    res.status(200).end();
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).end();
  }
});

module.exports = router;
