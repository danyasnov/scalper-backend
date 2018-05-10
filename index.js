const mongoose = require('mongoose');
const Telegraf = require('telegraf');
const express = require('express');
const {startAllTasks} = require('./cron');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

//connect to db
mongoose.connect('mongodb://123123123:123123123@ds241869.mlab.com:41869/bittrex-scalper-bot');
mongoose.connection.once('open', function () {
    console.log('Mongo connected!');
    startAllTasks();
});

//start bot
if (process.env.ENV === 'development') {
    bot.telegram.setWebhook('');
    bot.startPolling();
} else {
    bot.telegram.setWebhook('https://scalper.xyz/secret-path');
    app.use(bot.webhookCallback('/secret-path'));
}

//start server
app.listen(3000, () => console.log('App listening on port 3000!'));

module.exports = {
    bot, app
};

require('./server');
require('./bot');