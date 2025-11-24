const a = require("axios");
const b = require("fs");
const c = require("path");
const d = require("yt-search");

module.exports = {
  config: {
    name: "sing",
    aliases: ["music", "song"],
    version: "0.0.1",
    author: "Aryan",
    countDown: 5,
    role: 0,
    shortDescription: "Sing tomake chai",
    longDescription: "Search and download music from YouTube",
    category: "MUSIC",
    guide: "/music <song name or YouTube URL>"
  },

  onStart: async function ({ api: e, event: f, args: g }) {
    if (!g.length)
      return e.sendMessage("❌ Provide a song name or YouTube URL.", f.threadID, f.messageID);

    let h = g.join(" ");
    const i = await e.sendMessage("🎵 patience orr je cherche...", f.threadID, null, f.messageID);

    try {
      // ───────────────────────────
      // 1. Trouver l’URL YouTube
      // ───────────────────────────
      let j;
      if (h.startsWith("http")) {
        j = h;
      } else {
        const k = await d(h);
        if (!k || !k.videos.length) throw new Error("No results found.");
        j = k.videos[0].url;
      }

      // ───────────────────────────
      // 2. Nouvelle API
      // ───────────────────────────
      const apiUrl = `https://api.nyx.team/ytdl?url=${encodeURIComponent(j)}&type=audio`;
      const m = await a.get(apiUrl);
      const n = m.data;

      if (!n.status || !n.url) throw new Error("API did not return a valid download URL.");

      // ───────────────────────────
      // 3. Nom du fichier
      // ───────────────────────────
      const o = `${n.title}.mp3`.replace(/[\\/:"*?<>|]/g, "");
      const p = c.join(__dirname, o);

      // ───────────────────────────
      // 4. Télécharger le MP3
      // ───────────────────────────
      const q = await a.get(n.url, { responseType: "arraybuffer" });
      b.writeFileSync(p, q.data);

      // ───────────────────────────
      // 5. Envoyer le fichier
      // ───────────────────────────
      await e.sendMessage(
        {
          attachment: b.createReadStream(p),
          body: `🎵 𝗠𝗨𝗦𝗜𝗖\n━━━━━━━━━━━━━━━\n\n${n.title}`
        },
        f.threadID,
        () => {
          b.unlinkSync(p);
          e.unsendMessage(i.messageID);
        },
        f.messageID
      );

    } catch (r) {
      console.error(r);
      e.sendMessage(`❌ Failed to download song: ${r.message}`, f.threadID, f.messageID);
      e.unsendMessage(i.messageID);
    }
  }
};
