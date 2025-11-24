const axios = require("axios");

const nix = {
  name: "copilot",
  version: "1.0",
  description: "Répond à un prompt en utilisant l'API AI copilot.",
  author: "Christus",
  prefix: false,
  category: "ai",
  type: "anyone",
  cooldown: 3,
  guide: "{p}copilot <texte>",
};

async function onStart({ bot, message, chatId, args }) {
  if (!args.length) {
    return message.reply(`❗ Merci de fournir un texte.\nUsage: /copilot <texte>`);
  }

  const text = args.join(" ");
  const url = `https://api.nekolabs.web.id/ai/copilot?text=${encodeURIComponent(text)}`;

  const waitMsg = await message.reply("🤖 En cours de génération...");

  try {
    const { data } = await axios.get(url);

    if (data.success) {
      const replyText = data.result.text;
      await bot.editMessageText(replyText, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
      });
    } else {
      await bot.editMessageText("❌ L'API a renvoyé une erreur.", {
        chat_id: chatId,
        message_id: waitMsg.message_id,
      });
    }
  } catch (err) {
    await bot.editMessageText(`❌ Erreur lors de l'appel à l'API: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
}

module.exports = { nix, onStart };
