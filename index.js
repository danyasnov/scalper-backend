const mongoose = require('mongoose');

const Telegraf = require('telegraf');

const {startAllTasks} = require('./cron');
const bot = new Telegraf(process.env.BOT_TOKEN);
const express = require('express');
const app = express();

mongoose.connect('mongodb://123123123:123123123@ds241869.mlab.com:41869/bittrex-scalper-bot');

mongoose.connection.once('open', function () {
    console.log('Mongo connected!');
    // startAllTasks();
});


if (process.env.ENV === 'development') {
    bot.telegram.setWebhook('');
    bot.startPolling();
    console.log('Start poll')

} else {

    bot.telegram.setWebhook('https://scalper.xyz/secret-path')
    app.use(bot.webhookCallback('/secret-path'));
    console.log('Start wh')
}

app.listen(3000, () => console.log('App listening on port 3000!'));

exports.bot = bot;
exports.app = app;

require('./server');
require('./bot');