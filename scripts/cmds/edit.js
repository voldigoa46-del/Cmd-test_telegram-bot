const axios = require("axios");

/* ================= CONFIG ================= */

const CONFIG_URL =
  "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";

/* ================= META ================= */

const nix = {
  name: "edit",
  aliases: ["imgedit"],
  author: "Christus",
  version: "1.0.1",
  cooldown: 5,
  role: 0,
  prefix: true,
  description: "Generate or edit images using AI (reply to image to edit)",
  category: "AI",
  guide: "{p}edit <prompt> (reply to an image to edit)",
};

/* ================= HELPERS ================= */

async function getRenzApi() {
  const { data } = await axios.get(CONFIG_URL, { timeout: 10000 });
  if (!data || !data.renz) {
    throw new Error("Renz API URL not found");
  }
  return data.renz;
}

function getReplyImage(msg) {
  const reply = msg.reply_to_message;
  if (!reply || !reply.photo) return null;

  // Telegram photo → prendre la meilleure qualité
  const photo = reply.photo[reply.photo.length - 1];
  return photo?.file_id || null;
}

/* ================= COMMAND ================= */

async function onStart({ bot, message, msg, chatId, args }) {
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return message.reply(
      "❌ Please provide a prompt.\nExample: edit a cyberpunk city"
    );
  }

  let waitMsg;
  try {
    waitMsg = await bot.sendMessage(
      chatId,
      "⏳ Processing image...",
      { reply_to_message_id: msg.message_id }
    );

    const BASE_URL = await getRenzApi();
    const fileId = getReplyImage(msg);

    let apiURL =
      `${BASE_URL}/api/gptimage?prompt=${encodeURIComponent(prompt)}`;

    if (fileId) {
      apiURL += `&ref=${encodeURIComponent(fileId)}`;
    } else {
      apiURL += `&width=512&height=512`;
    }

    const imgStream = await axios({
      url: apiURL,
      method: "GET",
      responseType: "stream",
    });

    if (waitMsg) {
      await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
    }

    await bot.sendPhoto(
      chatId,
      imgStream.data,
      {
        caption:
          `🖼️ ${fileId ? "Image edited successfully" : "Image generated successfully"}\n` +
          `📝 Prompt: ${prompt}`,
        reply_to_message_id: msg.message_id,
      }
    );

  } catch (err) {
    console.error("EDIT CMD ERROR:", err.message);

    if (waitMsg) {
      await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
    }

    await message.reply(
      "❌ Failed to process image. Please try again later."
    );
  }
}

/* ================= EXPORT ================= */

module.exports = {
  nix,
  onStart,
};
