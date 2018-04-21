const Scene = require('telegraf/scenes/base');
const Stage = require('telegraf/stage');
const User = require('../models/user');
const Task = require('../models/task');
const {getMarkets} = require('../utils/api');
const _ = require('lodash');
const {startTask} = require('../cron');

const addTaskTitleScene = new Scene('add-task-title');
addTaskTitleScene.enter((ctx) => ctx.reply('Type correct pair name(eg. "BTC-LTC")'));
addTaskTitleScene.on('text', async (ctx) => {
    let markets = await getMarkets();
    let text = ctx.message.text;
    let fromId = ctx.message.from.id;
    if (_.filter(markets, m => m.MarketName === text.toUpperCase()).length) {
        ctx.scene.enter('add-depth-filter');
        ctx.session[fromId] = {
            newTaskTitle: text.toUpperCase()
        }
    } else {
        return ctx.reply('Type correct pair name(eg. "BTC-LTC")')
    }
});

const addDepthFilterScene = new Scene('add-depth-filter');
addDepthFilterScene.enter((ctx) => ctx.reply('Enter depth filter in %(1-100)'));
addDepthFilterScene.on('text', (ctx) => {
    let text = ctx.message.text;
    let fromId = ctx.message.from.id;
    if (text.match(/\d+/i) && parseInt(text) > 0 && parseInt(text) < 101) {
        ctx.scene.enter('add-task-range');
        ctx.session[fromId].newDepthFilter = parseInt(text)
    } else {
        return ctx.reply('Enter depth filter in %(1-100)')
    }
});

const addTaskRangeScene = new Scene('add-task-range');
addTaskRangeScene.enter((ctx) => ctx.reply('Enter interval in minutes(1-59)'));
addTaskRangeScene.on('text', (ctx) => {
    let text = ctx.message.text;
    let fromId = ctx.message.from.id;
    if (text.match(/\d+/i) && parseInt(text) > 0 && parseInt(text) < 60) {

        let task = new Task({
            title: ctx.session[fromId].newTaskTitle,
            depthFilter: ctx.session[fromId].newDepthFilter,
            interval: text,
            active: true,
            userId: fromId
        });
        task.save((err, data) => {
            if (err) return;
            startTask(data)
        });

        ctx.scene.leave()
    } else {
        return ctx.reply('Enter interval in minutes(1-59)')
    }
});
addTaskRangeScene.leave((ctx) => ctx.reply('Created'));




const stage = new Stage([addTaskTitleScene, addTaskRangeScene, addDepthFilterScene]);

module.exports = stage;