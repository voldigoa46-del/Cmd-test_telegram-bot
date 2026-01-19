const axios = require("axios");

const CONFIG_URL =
  "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";

const nix = {
  name: "edit",
  aliases: ["imgedit", "gen"],
  version: "1.2.0",
  author: "Christus",
  cooldown: 5,
  role: 0,
  prefix: true,
  category: "ai",
  description: "Generate or edit images using AI",
  guide:
    "{p}edit <prompt>\n" +
    "Reply to an image to edit it\n" +
    "Example: reply image + {p}edit anime style",
};

async function getRenzApi() {
  const { data } = await axios.get(CONFIG_URL, { timeout: 10000 });
  if (!data?.renz) throw new Error("API config not found");
  return data.renz;
}

async function onStart({ bot, message, msg, chatId, args }) {
  const prompt = args.join(" ").trim();
  if (!prompt) {
    return message.reply("❌ Please provide a prompt.");
  }

  const waitMsg = await bot.sendMessage(
    chatId,
    "🖼️ Processing image...",
    { reply_to_message_id: msg.message_id }
  );

  try {
    const BASE_URL = await getRenzApi();

    let apiURL = `${BASE_URL}/api/gptimage?prompt=${encodeURIComponent(prompt)}`;
    let mode = "gen";

    /* ===== IMAGE REPLY HANDLING (FIXED) ===== */
    const photo =
      msg.reply_to_message?.photo?.slice(-1)[0]; // meilleure qualité

    if (photo?.file_id) {
      const imageURL = await bot.getFileLink(photo.file_id);
      apiURL += `&ref=${encodeURIComponent(imageURL)}`;
      mode = "edit";
    } else {
      apiURL += `&width=512&height=512`;
    }

    /* ===== SAFE REQUEST ===== */
    const res = await axios.get(apiURL, {
      responseType: "arraybuffer",
      validateStatus: () => true,
    });

    const contentType = res.headers["content-type"] || "";
    if (!contentType.startsWith("image/")) {
      throw new Error("API did not return an image");
    }

    await bot.deleteMessage(chatId, waitMsg.message_id);

    await bot.sendPhoto(
      chatId,
      Buffer.from(res.data),
      {
        caption:
          `${mode === "edit" ? "🖌 IMAGE EDITED" : "🖼 IMAGE GENERATED"}\n` +
          `━━━━━━━━━━━━━━━\n` +
          `📝 Prompt: ${prompt}`,
        reply_to_message_id: msg.message_id,
      }
    );

  } catch (err) {
    console.error("EDIT CMD ERROR:", err?.response?.data || err);

    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
    await bot.sendMessage(
      chatId,
      "❌ Failed to process image. Please try again later.",
      { reply_to_message_id: msg.message_id }
    );
  }
}

module.exports = {
  nix,
  onStart,
};
