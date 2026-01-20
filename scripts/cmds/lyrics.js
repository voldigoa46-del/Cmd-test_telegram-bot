const axios = require("axios");
const fs = require("fs");
const path = require("path");

const nix = {
  name: "lyrics",
  aliases: ["lyric", "songtext"],
  version: "1.2.1",
  author: "Christus dev AI",
  cooldown: 5,
  role: 0,
  prefix: true,
  category: "search",
  description: "Retrieve song lyrics with artist and artwork",
  guide: "{p}lyrics <song name>\nExample: {p}lyrics apt",
};

const UNISpectra = {
  charm: "✨",
  standardLine: "━━━━━━━━━━━━━━━━━━━━",
};

function formatLyrics(data) {
  return `${UNISpectra.charm} Lyrics Transmission
${UNISpectra.standardLine}
🎼 Title   : ${data.track_name || "Unknown"}
👤 Artist  : ${data.artist_name || "Unknown"}
${UNISpectra.standardLine}

${data.lyrics || "Lyrics not available."}

${UNISpectra.standardLine}
${UNISpectra.charm} ChristusBot 🌌`;
}

async function onStart({ bot, message, msg, chatId, args }) {
  const query = args.join(" ").trim();
  if (!query) return message.reply("⚠️ Please provide a song name.\nExample: lyrics apt");

  try {
    const { data } = await axios.get(
      `https://lyricstx.vercel.app/youtube/lyrics?title=${encodeURIComponent(query)}`
    );

    if (!data?.lyrics) return message.reply("❌ Lyrics not found.");

    const bodyText = formatLyrics(data);

    const imagePath = path.join(__dirname, `lyrics_${Date.now()}.jpg`);

    try {
      if (data.artwork_url) {
        const imgRes = await axios.get(data.artwork_url, { responseType: "stream" });
        const writer = fs.createWriteStream(imagePath);
        imgRes.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        await bot.sendMessage(chatId, {
          body: bodyText || "Lyrics not available.",
          attachment: fs.createReadStream(imagePath),
          reply_to_message_id: msg.message_id,
        });

        fs.unlinkSync(imagePath);
        return;
      }
    } catch (err) {
      console.error("Artwork fetch failed, sending without image.", err);
    }

    // Fallback: send lyrics only
    await bot.sendMessage(chatId, {
      body: bodyText || "Lyrics not available.",
      reply_to_message_id: msg.message_id,
    });
  } catch (err) {
    console.error("Lyrics Error:", err);
    await bot.sendMessage(chatId, {
      body: "❌ Error: Could not fetch lyrics.",
      reply_to_message_id: msg.message_id,
    });
  }
}

module.exports = {
  nix,
  onStart,
};
