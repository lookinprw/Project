const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

async function createRichMenuImage() {
  // Create canvas with rich menu dimensions
  const canvas = createCanvas(2500, 1686);
  const ctx = canvas.getContext("2d");

  // Fill background
  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(0, 0, 2500, 1686);

  // Define sections
  const sections = [
    { x: 0, y: 0, w: 833, h: 843, text: "แจ้งปัญหา", icon: "🔔" },
    { x: 834, y: 0, w: 833, h: 843, text: "ดูสถานะ", icon: "📊" },
    { x: 1667, y: 0, w: 833, h: 843, text: "ดู ID", icon: "🆔" },
    { x: 0, y: 843, w: 1250, h: 843, text: "รายการปัญหา", icon: "📝" },
    { x: 1251, y: 843, w: 1249, h: 843, text: "ช่วยเหลือ", icon: "❓" },
  ];

  // Draw sections
  sections.forEach((section) => {
    // Draw section border
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.strokeRect(section.x, section.y, section.w, section.h);

    // Draw icon
    ctx.font = "120px serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.fillText(
      section.icon,
      section.x + section.w / 2,
      section.y + section.h / 2 - 60
    );

    // Draw text
    ctx.font = "60px sans-serif";
    ctx.fillStyle = "#374151";
    ctx.fillText(
      section.text,
      section.x + section.w / 2,
      section.y + section.h / 2 + 60
    );
  });

  // Save the image
  const buffer = canvas.toBuffer("image/png");
  const filePath = path.join(__dirname, "assets", "rich-menu.png");
  fs.writeFileSync(filePath, buffer);
  console.log("Rich menu image created at:", filePath);
}

createRichMenuImage().catch(console.error);
