const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  nix: {
    name: "cdp",
    aliases: ["coupledp", "ppcouple"],
    version: "1.0.0",
    author: "Christus",
    role: 0,
    category: "image",
    description: "Envoie deux photos de profil assorties pour les couples.",
    cooldown: 5,
    guide: "{p}cdp"
  },

  async onStart({ bot, msg, chatId }) {
    try {
      // Message d'attente discret (optionnel)
      // bot.sendMessage(chatId, "⏳ Recherche d'un couple assorti...");

      // 1. Appel à l'API pour récupérer les deux URLs
      const res = await axios.get("https://xsaim8x-xxx-api.onrender.com/api/cdp2");
      const { boy, girl } = res.data;

      if (!boy || !girl) {
        throw new Error("Données d'image manquantes");
      }

      // 2. Préparation du dossier temporaire
      const cacheDir = path.join(__dirname, "cache_cdp");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const pathBoy = path.join(cacheDir, `boy_${Date.now()}.jpg`);
      const pathGirl = path.join(cacheDir, `girl_${Date.now()}.jpg`);

      // 3. Téléchargement des deux images en parallèle
      const [resBoy, resGirl] = await Promise.all([
        axios.get(boy, { responseType: 'arraybuffer' }),
        axios.get(girl, { responseType: 'arraybuffer' })
      ]);

      fs.writeFileSync(pathBoy, Buffer.from(resBoy.data));
      fs.writeFileSync(pathGirl, Buffer.from(resGirl.data));

      // 4. Envoi sous forme d'album (Media Group)
      // Cela permet de recevoir les deux images ensemble dans un seul bloc
      const mediaGroup = [
        {
          type: 'photo',
          media: fs.createReadStream(pathBoy),
          caption: "✨ Voici votre couple DP !\n👤 Version Garçon"
        },
        {
          type: 'photo',
          media: fs.createReadStream(pathGirl),
          caption: "👤 Version Fille"
        }
      ];

      await bot.sendMediaGroup(chatId, mediaGroup);

      // 5. Nettoyage des fichiers
      setTimeout(() => {
        if (fs.existsSync(pathBoy)) fs.unlinkSync(pathBoy);
        if (fs.existsSync(pathGirl)) fs.unlinkSync(pathGirl);
      }, 5000);

    } catch (error) {
      console.error("Erreur commande CDP:", error);
      bot.sendMessage(chatId, "❌ Impossible de récupérer le couple DP pour le moment.");
    }
  }
};
