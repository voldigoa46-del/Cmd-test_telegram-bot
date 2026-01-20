module.exports = {
  nix: {
    name: "menu",
    version: "3.2.1",
    author: "Christus dev AI",
    aliases: ["help", "start", "aide"],
    description: "Affiche la liste dynamique des commandes du bot.",
    category: "système",
    role: 0,
    cooldown: 1,
    guide: "{p}menu [nom de commande]"
  },

  async onStart({ bot, msg, chatId, args }) {
    // Accès à la collection globale des commandes Nix
    if (!global.teamnix || !global.teamnix.cmds) {
      return bot.sendMessage(chatId, "❌ Erreur : Le système de commandes n'est pas initialisé.");
    }
    
    const commands = global.teamnix.cmds;
    const prefix = "/"; // Tu peux adapter selon ton préfixe réel

    // --- 1. DÉTAILS D'UNE COMMANDE PRÉCISE ---
    if (args[0] && args[0].toLowerCase() !== "all") {
      const query = args[0].toLowerCase();
      const specificCmd = [...commands.values()].find(
        (c) => c.nix.name === query || (c.nix.aliases && c.nix.aliases.includes(query))
      );

      if (specificCmd) {
        const { name, description, category, cooldown, author, version, aliases } = specificCmd.nix;

        let detail = `╭─── 📄 INFO : ${name.toUpperCase()} ───\n`;
        detail += `│ 📜 Nom : ${name}\n`;
        detail += `│ 👤 Auteur : ${author || "Inconnu"}\n`;
        detail += `│ 💬 Description : ${description || "Aucune description"}\n`;
        detail += `│ 📁 Catégorie : ${category || "Autres"}\n`;
        detail += `│ ⏳ Cooldown : ${cooldown || 0}s\n`;
        detail += `│ 🖇️ Alias : ${aliases ? aliases.join(", ") : "Aucun"}\n`;
        detail += `│ 📋 Version : ${version || "1.0.0"}\n`;
        detail += `╰────────────────`;
        
        return bot.sendMessage(chatId, detail);
      } else {
        return bot.sendMessage(chatId, `❌ La commande ${query} n'existe pas.`);
      }
    }

    // --- 2. MENU GÉNÉRAL ---
    const categorizedCommands = {};

    // Groupement des commandes par catégorie
    [...commands.values()].forEach((command) => {
      const category = command.nix.category || "Autres";
      if (!categorizedCommands[category]) categorizedCommands[category] = [];
      
      // Éviter les doublons de noms (si une commande est chargée deux fois)
      if (!categorizedCommands[category].includes(command.nix.name)) {
        categorizedCommands[category].push(command.nix.name);
      }
    });

    // Tri alphabétique des catégories
    const sortedCategories = Object.keys(categorizedCommands).sort();

    let result = `📚 MENU DES COMMANDES NIX\n\n`;

    for (const category of sortedCategories) {
      // Titre de la catégorie avec émoji fraise comme dans l'original
      result += `🍓 ${category.toUpperCase()}\n`;
      
      // Liste des commandes avec l'émoji fleur
      const cmdList = categorizedCommands[category]
        .sort()
        .map(name => `✿ ${name}`)
        .join("   ");
      
      result += `${cmdList}\n\n`;
    }

    // Pied de page
    const totalCmds = [...new Set([...commands.values()].map(c => c.nix.name))].length;
    result += `📊 Total des commandes : ${totalCmds}\n`;
    result += `🔧 Aide spécifique : ${prefix}menu [nom]\n`;
    result += `🤖 Système Nix par Christus dev AI`;

    return bot.sendMessage(chatId, result);
  }
};
