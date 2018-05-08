const User = require('../models/user');
const Task = require('../models/task');
const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');
const _ = require('lodash');

async function getTaskListMarkup(id, action) {
    // let user = await User.findOne({id}).populate('tasks');
    let tasks = await Task.find({userId: id});

    if (tasks.length) {
        return Extra
            .HTML()
            .markup((m) => {
                let btnArray = [];
                _.each(tasks, (task, i) => {
                    btnArray = [...btnArray, m.callbackButton(`${task.title} ${task.filterDepth}% ${task.interval}m (active: ${task.active})`, `${action}-task:${task._id}`)]
                });
                return m.inlineKeyboard(btnArray, {columns: 1})
            });
    }
}

module.exports = {
    getTaskListMarkup
};