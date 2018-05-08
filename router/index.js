const Router = require('telegraf/router');
const Task = require('../models/task');
const mongoose = require('mongoose');
const User = require('../models/user');
const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');
const _ = require('lodash');
const {getTaskListMarkup} = require('../utils');
const {stopTask, removeTask, switchTask} = require('../cron');

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

appRouter.on('remove-task', async ctx => {
    await Task.findByIdAndRemove(ctx.state.id);
    removeTask({_id: ctx.state.id});

    let markup = await getTaskListMarkup(ctx.from.id, 'remove');
    ctx.answerCbQuery(`Successful removing`);
    if (markup) {
        return ctx.editMessageText(`Click to remove`, markup)
    } else {
        return ctx.editMessageText(`There are no tasks in your list`)
    }
});

appRouter.on('switch-task', async ctx => {
    let task = await Task.findById(new mongoose.Types.ObjectId(ctx.state.id));
    task.active = !task.active;
    switchTask(task);

    await task.save();

    let markup = await getTaskListMarkup(ctx.from.id, 'switch');
    ctx.answerCbQuery(`Successful switching`);
    if (markup) {
        return ctx.editMessageText(`Click to switch`, markup)
    } else {
        return ctx.editMessageText(`There are no tasks in your list`)
    }
});

module.exports = appRouter;

