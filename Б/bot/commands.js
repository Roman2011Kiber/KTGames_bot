module.exports = function registerCommands(bot) {

  bot.onText(/\/games/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      "🎮 Обери гру:",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "⚓ Морський бій", callback_data: "game_sea" }],
            [{ text: "🧩 Хрестики нолики", callback_data: "game_xn" }]
          ]
        }
      }
    );
  });

};
