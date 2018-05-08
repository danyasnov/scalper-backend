const _ = require('lodash');
const mongoose = require('mongoose');
const session = require('telegraf/session');
const stage = require('./scenes');
const Telegraf = require('telegraf');
const rateLimit = require('telegraf-ratelimit');
const appRouter = require('./router');
const {startAllTasks} = require('./cron');
const bot = new Telegraf(process.env.BOT_TOKEN);
const express = require('express');
const app = express();

mongoose.connect('mongodb://123123123:123123123@ds241869.mlab.com:41869/bittrex-scalper-bot');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('Mongo connected!');
    // startAllTasks();
});

const limitConfig = {
    onLimitExceeded: (ctx, next) => ctx.reply('Rate limit exceeded')
};

bot.use(session());
bot.use(stage.middleware());
bot.use((ctx, next) => {
    const start = new Date();
    return next(ctx).then(() => {
        const ms = new Date() - start;
        console.log('Response time %sms', ms)
    })
});

bot.use(require('./handlers'));
bot.use(rateLimit(limitConfig));


bot.on('callback_query', appRouter);

bot.catch(err => console.log(err));


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

