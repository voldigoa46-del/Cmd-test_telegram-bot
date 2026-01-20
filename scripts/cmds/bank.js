const fs = require('fs');
const path = require('path');

const nix = {
  name: "bank",
  version: "4.5",
  aliases: ["bk", "banque", "eco"],
  description: "Système économique complet : Banque, Bourse, Crypto, Immobilier et Crime.",
  author: "Christus",
  role: 0,
  category: "economy",
  cooldown: 5,
  guide: "{p}bank help"
};

/* ================= GESTION DES DONNÉES ================= */

const getBalanceData = () => {
  const dataPath = path.join(process.cwd(), 'database', 'balance.json');
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
};

const saveData = (data) => {
  const dataPath = path.join(process.cwd(), 'database', 'balance.json');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

const formatMoney = (amount) => {
  if (isNaN(amount)) return "0 💰";
  const scales = [
    { value: 1e15, suffix: 'Q', color: '🌈' },
    { value: 1e12, suffix: 'T', color: '✨' },
    { value: 1e9, suffix: 'B', color: '💎' },
    { value: 1e6, suffix: 'M', color: '💰' },
    { value: 1e3, suffix: 'k', color: '💵' }
  ];
  const scale = scales.find(s => Math.abs(amount) >= s.value);
  if (scale) {
    const scaledValue = amount / scale.value;
    return `${scale.color}${scaledValue.toFixed(2)}${scale.suffix}`;
  }
  return `${amount.toLocaleString()} 💰`;
};

/* ================= DONNÉES DU MARCHÉ ================= */

const market = {
  stocks: {
    AAPL: { name: "Apple", price: 150 },
    TSLA: { name: "Tesla", price: 800 },
    GOOG: { name: "Google", price: 2800 }
  },
  crypto: {
    BTC: { name: "Bitcoin", price: 45000 },
    ETH: { name: "Ethereum", price: 3000 }
  },
  realestate: {
    studio: { name: "Studio", price: 50000 },
    villa: { name: "Villa", price: 500000 },
    palais: { name: "Palais", price: 10000000 }
  }
};

/* ================= LOGIQUE PRINCIPALE ================= */

async function onStart({ bot, message, msg, chatId, args }) {
  const sub = args[0]?.toLowerCase();
  const userId = msg.from.id;
  const balances = getBalanceData();

  if (!balances[userId]) {
    balances[userId] = { 
      money: 1000, bank: 0, loan: 0, lastRob: 0,
      stocks: {}, crypto: {}, assets: []
    };
  }
  const u = balances[userId];

  switch (sub) {
    // --- MODULE AIDE ---
    case "help":
      return bot.sendMessage(chatId, 
        `🏦 SYSTÈME BANCAIRE NIX V4.5 🏦\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `💰 GÉNÉRAL :\n` +
        `• {p}bank : Voir ton profil\n` +
        `• {p}bank dep [montant|all] : Déposer\n` +
        `• {p}bank wd [montant|all] : Retirer\n` +
        `• {p}bank transfer [@tag] [montant] : Envoyer\n\n` +
        `📉 INVESTISSEMENTS :\n` +
        `• {p}bank market : Voir les cours\n` +
        `• {p}bank buy [symbole] [quantité] : Acheter\n` +
        `• {p}bank sell [symbole] [quantité] : Vendre\n\n` +
        `🔫 CRIME & PRÊTS :\n` +
        `• {p}bank rob [@tag] : Voler quelqu'un\n` +
        `• {p}bank loan [montant] : Emprunter\n` +
        `━━━━━━━━━━━━━━━━`.replace(/{p}/g, "/")
      );

    // --- MODULE BANQUE ---
    case "dep":
    case "deposit":
      let depAmt = args[1] === "all" ? u.money : parseInt(args[1]);
      if (isNaN(depAmt) || depAmt <= 0 || u.money < depAmt) return bot.sendMessage(chatId, "❌ Solde liquide insuffisant ou montant invalide.");
      u.money -= depAmt;
      u.bank = (u.bank || 0) + depAmt;
      saveData(balances);
      return bot.sendMessage(chatId, `✅ Déposé : ${formatMoney(depAmt)} en banque.`);

    case "wd":
    case "withdraw":
      let wdAmt = args[1] === "all" ? u.bank : parseInt(args[1]);
      if (isNaN(wdAmt) || wdAmt <= 0 || u.bank < wdAmt) return bot.sendMessage(chatId, "❌ Solde banque insuffisant.");
      u.bank -= wdAmt;
      u.money += wdAmt;
      saveData(balances);
      return bot.sendMessage(chatId, `✅ Retiré : ${formatMoney(wdAmt)} en liquide.`);

    // --- MODULE MARCHÉ (STOCKS/CRYPTO) ---
    case "market":
      let mTxt = `📈 COURS DU MARCHÉ 📊\n━━━━━━━━━━━━\n`;
      for (const [s, d] of Object.entries(market.stocks)) mTxt += `🔹 ${s} (${d.name}) : ${formatMoney(d.price)}\n`;
      for (const [c, d] of Object.entries(market.crypto)) mTxt += `🔸 ${c} (${d.name}) : ${formatMoney(d.price)}\n`;
      return bot.sendMessage(chatId, mTxt);

    case "buy":
      const symbol = args[1]?.toUpperCase();
      const qty = parseInt(args[2]) || 1;
      const item = market.stocks[symbol] || market.crypto[symbol] || market.realestate[symbol];
      if (!item) return bot.sendMessage(chatId, "❌ Symbole inconnu (Ex: AAPL, BTC, villa).");
      const cost = item.price * qty;
      if (u.money < cost) return bot.sendMessage(chatId, `❌ Il vous manque ${formatMoney(cost - u.money)}.`);
      
      u.money -= cost;
      if (market.realestate[symbol]) {
        u.assets = u.assets || [];
        for(let i=0; i<qty; i++) u.assets.push(item.name);
      } else {
        const type = market.stocks[symbol] ? 'stocks' : 'crypto';
        u[type][symbol] = (u[type][symbol] || 0) + qty;
      }
      saveData(balances);
      return bot.sendMessage(chatId, `✅ Acheté : ${qty}x ${symbol} pour ${formatMoney(cost)}.`);

    // --- MODULE TRANSFERT & VOL ---
    case "transfer":
      const tMsg = msg.reply_to_message;
      const tAmt = parseInt(args[1]);
      if (!tMsg || isNaN(tAmt) || tAmt <= 0 || u.money < tAmt) return bot.sendMessage(chatId, "❌ Répondez à quelqu'un et indiquez un montant valide.");
      const tId = tMsg.from.id;
      balances[tId] = balances[tId] || { money: 0, bank: 0 };
      u.money -= tAmt;
      balances[tId].money += tAmt;
      saveData(balances);
      return bot.sendMessage(chatId, `💸 Transfert de ${formatMoney(tAmt)} vers ${tMsg.from.first_name} réussi.`);

    case "rob":
      const rTarget = msg.reply_to_message;
      if (!rTarget) return bot.sendMessage(chatId, "❌ Répondez à la victime !");
      const now = Date.now();
      if (now - (u.lastRob || 0) < 300000) return bot.sendMessage(chatId, "⏳ Attendez 5 min avant le prochain vol.");
      u.lastRob = now;
      const target = balances[rTarget.from.id] || { money: 0 };
      if (target.money < 1000) return bot.sendMessage(chatId, "❌ La victime est trop pauvre.");
      
      if (Math.random() > 0.5) {
        const stolen = Math.floor(target.money * 0.2);
        u.money += stolen;
        target.money -= stolen;
        saveData(balances);
        return bot.sendMessage(chatId, `🔫 Succès ! Vous avez volé ${formatMoney(stolen)} à ${rTarget.from.first_name}.`);
      } else {
        u.money = Math.max(0, u.money - 5000);
        saveData(balances);
        return bot.sendMessage(chatId, `🚨 Échec ! Vous avez payé une amende de 5 000 💰.`);
      }

    // --- MODULE PRÊT ---
    case "loan":
      const lAmt = parseInt(args[1]);
      if (isNaN(lAmt) || lAmt <= 0) return bot.sendMessage(chatId, "❌ Montant du prêt invalide.");
      u.bank = (u.bank || 0) + lAmt;
      u.loan = (u.loan || 0) + Math.round(lAmt * 1.15);
      saveData(balances);
      return bot.sendMessage(chatId, `🏦 Prêt de ${formatMoney(lAmt)} reçu ! Dette : ${formatMoney(u.loan)} (15% intérêts).`);

    // --- PROFIL PAR DÉFAUT ---
    default:
      const totalAssets = (u.assets || []).length;
      const portfolio = `
🏦 PORTFOLIO DE ${msg.from.first_name.toUpperCase()} 🏦
━━━━━━━━━━━━━━━━
💵 Liquide : ${formatMoney(u.money)}
💳 Banque : ${formatMoney(u.bank || 0)}
📉 Dette : ${formatMoney(u.loan || 0)}

📦 POSSESSIONS :
• Actions : ${Object.keys(u.stocks || {}).length} types
• Crypto : ${Object.keys(u.crypto || {}).length} types
• Immobilier : ${totalAssets} propriétés

Utilisez /bank help pour voir les commandes.
      `.trim();
      return bot.sendMessage(chatId, portfolio);
  }
}

module.exports = { nix, onStart };
