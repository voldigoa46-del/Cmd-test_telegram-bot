const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  nix: {
    name: "autodl",
    author: "Christus dev AI / Nix Adapt",
    version: "3.0.1",
    description: "Auto-téléchargeur pour YouTube, Spotify, TikTok, Instagram, etc.",
    usage: "autodl [on/off] ou envoyez simplement un lien",
    admin: false, // Accessible à tous pour le téléchargement
    vip: false,
    category: "Media",
    prefix: false,
    aliases: ["dl"]
  },

  async onStart({ message, args, event, userId }) {
    // Note: La gestion de la base de données (on/off) dépend de ton système.
    // Ici, nous traitons principalement le téléchargement si un lien est fourni.
    
    const body = event.body || "";
    const match = body.match(/https?:\/\/\S+/i);

    if (args[0] === "on" || args[0] === "off") {
      // Logique pour activer/désactiver si tu as une DB threads
      return message.reply(`✅ Auto-download configuré sur : ${args[0]}`);
    }

    if (match) {
      return await downloadMedia(match[0], message);
    } else {
      return message.reply("⚠️ Veuillez fournir un lien valide (TikTok, YT, FB, IG, Spotify).");
    }
  },

  async onChat({ message, event }) {
    // Cette fonction s'exécute à chaque message
    const body = event.body || "";
    const match = body.match(/https?:\/\/\S+/i);
    
    // On vérifie si c'est un lien supporté avant de lancer le téléchargement auto
    if (match && isSupported(match[0])) {
      await downloadMedia(match[0], message);
    }
  }
};

// --- Fonctions Utilitaires ---

const supportedLinks = {
  youtube: /(youtube\.com|youtu\.be)/i,
  instagram: /(instagram\.com|instagr\.am)/i,
  tiktok: /(tiktok\.com|vm\.tiktok\.com)/i,
  capcut: /(capcut\.com)/i,
  facebook: /(facebook\.com|fb\.watch)/i,
  twitter: /(twitter\.com|x\.com)/i,
  spotify: /(spotify\.com|spotify\.link)/i
};

function isSupported(url) {
  return Object.values(supportedLinks).some(r => r.test(url));
}

function formatDuration(durationMs) {
  if (!durationMs) return "N/A";
  const sec = Math.floor((durationMs / 1000) % 60);
  const min = Math.floor((durationMs / (1000 * 60)) % 60);
  return `${min}m ${sec}s`;
}

async function downloadMedia(url, message) {
  if (!isSupported(url)) return;

  try {
    const apiUrl = `https://downvid.onrender.com/api/download?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl, { timeout: 60000 });
    const data = res.data;

    if (!data || data.status !== "success") return;

    const mediaData = data?.data?.data || {};
    const videoUrl = data.video || mediaData.nowm || null;
    const audioUrl = data.audio || null;

    const downloads = [];
    let header = "📥 **Media Downloaded**\n";

    if (supportedLinks.spotify.test(url)) {
      if (audioUrl) downloads.push({ url: audioUrl, type: "audio" });
      header = "✅ **Spotify Audio** 🎧\n";
    } else if (supportedLinks.youtube.test(url)) {
      if (videoUrl) downloads.push({ url: videoUrl, type: "video" });
      else if (audioUrl) downloads.push({ url: audioUrl, type: "audio" });
      header = "✅ **YouTube Media** 🎬\n";
    } else {
      if (videoUrl) downloads.push({ url: videoUrl, type: "video" });
      header = "✅ **Video Downloaded** 🎬\n";
    }

    if (downloads.length === 0) return;

    const title = mediaData.title || "Media Nix";
    const duration = formatDuration(mediaData.duration_ms);
    const caption = `${header}\n📌 **Titre :** ${title}\n⏱️ **Durée :** ${duration}`;

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const streams = [];
    const tempFiles = [];

    for (const item of downloads) {
      const ext = item.type === "audio" ? "mp3" : "mp4";
      const tempPath = path.join(cacheDir, `dl_${Date.now()}.${ext}`);
      const response = await axios.get(item.url, { responseType: "arraybuffer" });
      fs.writeFileSync(tempPath, response.data);
      streams.push(fs.createReadStream(tempPath));
      tempFiles.push(tempPath);
    }

    await message.reply({
      body: caption,
      attachment: streams
    });

    // Nettoyage du cache
    tempFiles.forEach(f => { try { fs.unlinkSync(f); } catch (e) {} });

  } catch (err) {
    console.error("Autodl Error:", err);
  }
}
