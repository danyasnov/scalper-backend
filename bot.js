const rateLimit = require('telegraf-ratelimit');
const session = require('telegraf/session');
const {bot} = require('./index');
const User = require('./models/user');
const Task = require('./models/task');
const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');
const {switchTask} = require('./cron');
const Router = require('telegraf/router');
const mongoose = require('mongoose');
const Telegraf = require('telegraf');

bot.use(session());
bot.use((ctx, next) => {
    const start = new Date();
    return next(ctx).then(() => {
        const ms = new Date() - start;
        console.log('Response time %sms', ms)
    })
});

bot.use(rateLimit({
    onLimitExceeded: (ctx) => ctx.reply('Rate limit exceeded')
}));

bot.catch((err) => {
    console.log('Ooops', err)
});

bot.hears('🏠 Task list', async ctx => {
    let markup = await getTaskListMarkup(ctx.from.id, 'switch');
    if (markup) {
        return ctx.reply(`Click to switch`, markup)
    } else {
        return ctx.reply(`There are no tasks in your list`)
    }
});

bot.start((ctx) => {
    let user = new User(Object.assign(ctx.from));
    user.save((err) => {
    });

    return ctx.reply('✋ Welcome',
        Markup
            .keyboard(['🏠 Task list'])
            .resize()
            .extra())
});


const appRouter = new Router(({callbackQuery}) => {
    if (!callbackQuery.data) {
        return
    }
    const parts = callbackQuery.data.split(':');

    return {
        route: parts[0],
        state: {
            id: parts[1]
        }
    }
});

appRouter.on('switch-task', async ctx => {
    let task = await Task.findById(ctx.state.id);
    task.active = !task.active;

    await task.save();

    let markup = await getTaskListMarkup(ctx.from.id, 'switch');
    ctx.answerCbQuery(`Successful switching`);

    switchTask(task);
    if (markup) {
        return ctx.editMessageText(`Click to switch`, markup)
    } else {
        return ctx.editMessageText(`There are no tasks in your list`)
    }
});

bot.on('callback_query', appRouter);


async function getTaskListMarkup(id, action) {
    let tasks = await Task.find({userId: id});
    if (tasks.length) {
        return Extra
            .HTML()
            .markup((m) => {
                let btnArray = [];
                tasks.forEach((task, i) => {
                    btnArray = [...btnArray, m.callbackButton(`BTC-${task.currency} ${getBookType(task.bookType)} ${task.interval}m ${task.filterValue}${task.filterType === 0 ? '%' : 'BTC'}  (${task.active ? 'online' : 'stopped'})`, `${action}-task:${task._id}`)]
                });
                return m.inlineKeyboard(btnArray, {columns: 1})
            });
    }
}

function getBookType (type) {
    switch (type) {
        case 0:
            return 'BOTH';
        case 1:
            return 'BUY';
        case 2:
            return 'SELL';
    }
}