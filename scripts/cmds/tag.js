const fs = require("fs");
const path = require("path");

module.exports = {
  nix: {
    name: "tag",
    aliases: ["mention", "t", "appeler"],
    category: "groupe",
    role: 0, // Accessible à tous (mais tag all peut être limité si besoin)
    description: "Mentionne un utilisateur, les admins ou tout le monde.",
    author: "Christus",
    version: "2.1",
    guide: "{p}tag [nom] | admins | all\nOu répondez à un message avec {p}tag [message]"
  },

  async onStart({ bot, msg, chatId, args }) {
    const senderName = msg.from.first_name;
    const prefix = "/"; // Ton préfixe
    
    // Message supplémentaire (ex: /tag all Bonjour tout le monde)
    // On enlève le premier argument (le sous-commande) pour garder le reste
    let extraMessage = args.slice(1).join(" ") || "Regardez ça !";

    // --- CAS 1 : RÉPONSE À UN MESSAGE ---
    if (msg.reply_to_message) {
      const target = msg.reply_to_message.from;
      const text = `👤 <a href="tg://user?id=${target.id}">${target.first_name}</a>, ${senderName} vous a mentionné.\n\n💬 ${args.join(" ")}`;
      return bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    }

    const sub = args[0]?.toLowerCase();
    
    // Préparation de la base de données pour la recherche
    const dbPath = path.join(process.cwd(), 'database', 'balance.json');
    let dbUsers = {};
    if (fs.existsSync(dbPath)) {
      try { dbUsers = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch (e) {}
    }

    let mentions = [];
    let title = "";

    // --- CAS 2 : TAG ADMINS ---
    if (sub === "admins" || sub === "admin") {
      try {
        const admins = await bot.getChatAdministrators(chatId);
        // On filtre les bots pour ne taguer que les humains
        mentions = admins
          .filter(a => !a.user.is_bot)
          .map(a => `<a href="tg://user?id=${a.user.id}">${a.user.first_name}</a>`);
        title = "📢 APPEL DES ADMINS";
      } catch (e) {
        return bot.sendMessage(chatId, "❌ Impossible de récupérer la liste des administrateurs.");
      }
    } 
    
    // --- CAS 3 : TAG ALL (Tous ceux connus dans la DB) ---
    else if (sub === "all" || sub === "tous") {
      // Vérification admin pour éviter le spam (optionnel, supprime ce bloc si tu veux que tout le monde puisse le faire)
      /*
      const admins = await bot.getChatAdministrators(chatId);
      if (!admins.some(a => a.user.id === msg.from.id)) {
        return bot.sendMessage(chatId, "❌ Seuls les admins peuvent faire un appel général.");
      }
      */

      const ids = Object.keys(dbUsers);
      if (ids.length === 0) return bot.sendMessage(chatId, "⚠️ Base de données vide. Personne à mentionner.");
      
      mentions = ids.map(id => {
        const name = dbUsers[id].name || "Membre";
        return `<a href="tg://user?id=${id}">${name}</a>`;
      });
      title = "📢 APPEL GÉNÉRAL";
    }

    // --- CAS 4 : RECHERCHE PAR NOM (Dans la DB) ---
    else if (sub) {
      const keyword = sub.toLowerCase();
      const ids = Object.keys(dbUsers).filter(id => {
        const uName = (dbUsers[id].name || "").toLowerCase();
        return uName.includes(keyword);
      });

      if (ids.length === 0) return bot.sendMessage(chatId, `❎ Aucun utilisateur trouvé avec le nom "${sub}".`);

      mentions = ids.map(id => {
        const name = dbUsers[id].name || "Utilisateur";
        return `<a href="tg://user?id=${id}">${name}</a>`;
      });
      title = `📢 MENTIONS POUR "${sub.toUpperCase()}"`;
    } 
    
    // --- CAS 5 : AUCUN ARGUMENT ---
    else {
      return bot.sendMessage(chatId, "⚠️ Utilisation : /tag all, /tag admins ou /tag [nom]");
    }

    // --- ENVOI DU MESSAGE ---
    if (mentions.length > 0) {
      // On regroupe les mentions (ex: 5 par ligne pour lisibilité)
      let mentionString = "";
      mentions.forEach((m, i) => {
        mentionString += `👤 ${m}\n`;
      });

      const finalMsg = `${title}\npar ${senderName}\n\n${mentionString}\n💬 Message : ${extraMessage}`;

      // Gestion des limites de longueur Telegram (4096 chars)
      if (finalMsg.length > 4000) {
        return bot.sendMessage(chatId, "⚠️ Trop de personnes à mentionner d'un coup.");
      }

      await bot.sendMessage(chatId, finalMsg, { parse_mode: "HTML" });
    }
  }
};
