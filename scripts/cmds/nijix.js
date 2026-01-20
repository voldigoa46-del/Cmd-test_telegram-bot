const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const stream = require("stream");
const { promisify } = require("util");
const moment = require("moment-timezone");

const pipeline = promisify(stream.pipeline);

const aspectRatioMap = {
  "1:1": { width: 1024, height: 1024 },
  "9:7": { width: 1152, height: 896 },
  "7:9": { width: 896, height: 1152 },
  "19:13": { width: 1216, height: 832 },
  "13:19": { width: 832, height: 1216 },
  "7:4": { width: 1344, height: 768 },
  "4:7": { width: 768, height: 1344 },
  "12:5": { width: 1500, height: 625 },
  "5:12": { width: 640, height: 1530 },
  "16:9": { width: 1344, height: 756 },
  "9:16": { width: 756, height: 1344 },
  "2:3": { width: 1024, height: 1536 },
  "3:2": { width: 1536, height: 1024 },
};

const nix = {
  name: "nijix",
  aliases: [],
  version: "1.1.0",
  author: "Christus",
  cooldown: 10,
  role: 2,
  prefix: true,
  category: "AI Image Generator",
  description: "Anime-style image generation with style, preset, and aspect ratio support",
  guide:
    "{p}nijix <prompt> [--ar <ratio>] [--style <id>] [--preset <id>]\n" +
    "Example: {p}nijix a magical girl --ar 16:9 --style 2 --preset 1",
};

async function onStart({ bot, message, msg, chatId, args, input }) {
  if (!args.length) return message.reply("❌ Please provide a valid prompt.");

  let prompt = args.join(" ").trim();
  const styleMatch = prompt.match(/--style (\d+)/);
  const presetMatch = prompt.match(/--preset (\d+)/);
  const arMatch = prompt.match(/--ar (\d+:\d+)/);

  const styleIndex = styleMatch ? styleMatch[1] : "0";
  const presetIndex = presetMatch ? presetMatch[1] : "0";
  const aspectRatio = arMatch ? arMatch[1] : "1:1";

  prompt = prompt.replace(/--style \d+/, "")
                 .replace(/--preset \d+/, "")
                 .replace(/--ar \d+:\d+/, "")
                 .trim();

  const timestamp = moment().tz("Asia/Manila").format("MMMM D, YYYY h:mm A");
  const processingMsg = await bot.sendMessage(chatId, `⏳ Generating your anime-style image...\n• 📅 ${timestamp}`, {
    reply_to_message_id: msg.message_id,
  });

  const resolution = aspectRatioMap[aspectRatio] || aspectRatioMap["1:1"];
  const session_hash = Math.random().toString(36).substring(2, 13);
  const randomSeed = Math.floor(Math.random() * 1000000000);

  const payload = {
    data: [
      prompt,
      "",
      randomSeed,
      resolution.width,
      resolution.height,
      7,
      28,
      "Euler a",
      `${resolution.width} x ${resolution.height}`,
      "(None)",
      "Standard v3.1",
      false,
      0.55,
      1.5,
      true
    ],
    event_data: null,
    fn_index: 5,
    trigger_id: null,
    session_hash
  };

  try {
    await axios.post("https://asahina2k-animagine-xl-3-1.hf.space/queue/join", payload, {
      headers: { "User-Agent": "Mozilla/5.0", "Content-Type": "application/json" },
    });

    const res = await axios.get("https://asahina2k-animagine-xl-3-1.hf.space/queue/data", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/event-stream", "Content-Type": "application/json" },
      params: { session_hash },
      timeout: 30000,
    });

    const events = res.data.split("\n\n");
    let imageURL = null;

    for (const evt of events) {
      if (evt.startsWith("data:")) {
        try {
          const json = JSON.parse(evt.slice(5).trim());
          if (json.msg === "process_completed" && json.success) {
            imageURL = json.output?.data?.[0]?.[0]?.image?.url;
            break;
          }
        } catch {}
      }
    }

    if (!imageURL) {
      await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
      return message.reply("❌ Failed to generate image. Try again later.", { reply_to_message_id: msg.message_id });
    }

    const imgRes = await axios.get(imageURL, { responseType: "stream" });
    const cachePath = path.join(__dirname, "cache");
    await fs.ensureDir(cachePath);
    const imgPath = path.join(cachePath, `${session_hash}.png`);
    await pipeline(imgRes.data, fs.createWriteStream(imgPath));

    await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});

    await bot.sendPhoto(chatId, fs.createReadStream(imgPath), {
      caption: `✅ Image generated!\nStyle: ${styleIndex} | Preset: ${presetIndex} | AR: ${aspectRatio}\nSeed: ${randomSeed}`,
      reply_to_message_id: msg.message_id,
    });

    await fs.remove(imgPath);
  } catch (err) {
    console.error(err);
    await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
    message.reply("❌ Failed to generate image. Try again later.", { reply_to_message_id: msg.message_id });
  }
}

module.exports = {
  nix,
  onStart,
};
