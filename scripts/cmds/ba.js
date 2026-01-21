const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  nix: {
    name: "ba",
    aliases: ["bikini", "baimg"],
    version: "1.0.0",
    author: "Christus",
    role: 0,
    category: "NSFW",
    description: "Génère des images style BA via l'API Wildan Suldyir.",
    cooldown: 5,
    guide: "{p}ba [votre prompt]"
  },

  async onStart({ bot, msg, chatId, args }) {
    const prompt = args.join(" ").trim();
    
    if (!prompt) {
      return bot.sendMessage(chatId, "❌ Veuillez fournir un texte pour la génération.");
    }

    const waitMsg = await bot.sendMessage(chatId, "🔥 Génération de l'image BA en cours, veuillez patienter...");

    try {
      const API_URL = "https://wildan-suldyir-apis.vercel.app/api/ba";
      
      // Appel de l'API avec un timeout long car la génération peut prendre du temps
      const response = await axios.get(API_URL, {
        params: { prompt },
        responseType: "arraybuffer",
        timeout: 120000 
      });

      if (!response.data) {
        throw new Error("Aucune donnée reçue de l'API.");
      }

      // Dossier temporaire pour stocker l'image avant l'envoi
      const cacheDir = path.join(__dirname, "tmp");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const filePath = path.join(cacheDir, `ba_${Date.now()}.png`);
      fs.writeFileSync(filePath, Buffer.from(response.data));

      // Envoi de l'image sur Telegram
      await bot.sendPhoto(chatId, filePath, {
        caption: `✅ Image BA générée avec succès !\nPrompt : ${prompt}`
      });

      // Suppression du message d'attente et du fichier local
      bot.deleteMessage(chatId, waitMsg.message_id);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    } catch (err) {
      console.error("BA AI Error:", err.message);
      
      // En cas d'erreur, on prévient l'utilisateur sur le message existant
      bot.editMessageText("❌ Échec de la génération de l'image. L'API est peut-être surchargée.", {
        chat_id: chatId,
        message_id: waitMsg.message_id
      });
    }
  }
};
