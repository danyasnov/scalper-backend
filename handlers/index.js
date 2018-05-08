const User = require('../models/user');
const _ = require('lodash');
const mongoose = require('mongoose');
const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');
const {getTaskListMarkup} = require('../utils');
const Composer = require('telegraf/composer');

const composer = new Composer();

composer.hears('🤖 Create', (ctx) => {
    ctx.scene.enter('add-task-title')
});

composer.hears('🏠 Task list', async ctx => {
    // console.log(ctx.message)
    let markup = await getTaskListMarkup(ctx.from.id, 'switch');
    if (markup) {
        return ctx.reply(`Click to switch`, markup)
    } else {
        return ctx.reply(`There are no tasks in your list`)
    }
});


composer.hears('💀 Remove', async ctx => {
    let markup = await getTaskListMarkup(ctx.from.id, 'remove');
    if (markup) {
        return ctx.reply(`Click to remove`, markup)
    } else {
        return ctx.reply(`There are no tasks in your list`)
    }
});

composer.start((ctx) => {
    let user = new User(Object.assign(ctx.from));
    user.save((err) => {});

    return ctx.reply('✋ Welcome', Extra.markup(
        Markup.keyboard([
            '🏠 Task list',
            // '🤖 Create', '💀 Remove'
        ])
    ))
});

module.exports = composer;