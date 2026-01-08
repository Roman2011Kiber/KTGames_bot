const startSea = require("../games/sea/start");
const startxn = require("../games/xn/start");

module.exports = function (bot) {

  bot.on("callback_query", (q) => {
    const chatId = q.message.chat.id;

    switch (q.data) {
      case "game_sea":
        startSea(bot, chatId);
        break;
        
      case "game_xn":
        startxn(bot, chatId);
        break;
    }
  });

};
