// services/lineMessaging.js
const line = require("@line/bot-sdk");

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// Create a function to handle follow/add friend event
const handleFollow = async (event) => {
  const { userId } = event.source;
  console.log("User ID:", userId); // This will show the user ID in console

  // Send message to user with their ID
  await client.pushMessage(userId, {
    type: "text",
    text: `Your LINE User ID is: ${userId}`,
  });
};

// Create a function to handle messages
const handleMessage = async (event) => {
  const { userId } = event.source;

  if (event.message.text === "!id") {
    await client.pushMessage(userId, {
      type: "text",
      text: `Your LINE User ID is: ${userId}`,
    });
  }
};

module.exports = { config, client, handleFollow, handleMessage };
