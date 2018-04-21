const CronJob = require('cron').CronJob;
const Task = require('../models/task');
const _ = require('lodash');
const {getOrderBook} = require('../utils/api');
let jobs = {};
const Telegram = require('telegraf/telegram');
const telegram = new Telegram(process.env.BOT_TOKEN);
const Extra = require('telegraf/extra');


async function startAllTasks() {
    let tasks = await Task.find().populate('user');
    _.each(tasks, i => {
        startTask(i)
    })
}


module.exports = {
    startAllTasks,
    stopTask,
    startTask,
    switchTask,
    removeTask
};

function startTask(task) {
    let job = jobs[task._id];
    let state = {
        currentBuy: 0,
        currentSell: 0,
        previousBuy: 0,
        previousSell: 0,
        changeBuy: 0,
        changeSell: 0
    };

    if (job) {
        job.start()
    } else {
        const options = {
            cronTime: `${task.interval} * * * * *`,
            onTick: async function () {
                let orderBook = await getOrderBook(task.title);

                let buyOrders = orderBook.buy;
                let sellOrders = orderBook.sell;

                state.previousSell = state.currentSell;
                state.previousBuy = state.currentBuy;

                state.currentSell = 0;
                state.currentBuy = 0;


                _.each(buyOrders, (o) => {
                    state.currentBuy += o.Quantity * o.Rate;
                });

                _.each(sellOrders, (o) => {
                    state.currentSell += o.Quantity * o.Rate;
                });


                state.changeBuy = ((1 - state.previousBuy / state.currentBuy) * 100).toFixed(2);
                state.changeSell = ((1 - state.previousSell / state.currentSell) * 100).toFixed(2);


                if (Math.abs(state.changeBuy) >= task.depthFilter && state.previousBuy) {
                    let message = `⚫️ *${task.title}* ⚫️\n\n*BUY* ORDER BOOK CHANGE SIGNAL ➡️ *${state.changeBuy}%*`;
                    telegram.sendMessage(task.userId, message, Extra.markdown());

                }

                if (Math.abs(state.changeSell) >= task.depthFilter && state.previousSell) {
                    let message = `⚫️ *${task.title}* ⚫️\n\n*SELL* ORDER BOOK CHANGE SIGNAL ➡️ *${state.changeSell}%*`;

                    telegram.sendMessage(task.userId, message, Extra.markdown());

                }

            },
            startNow: !!task.active,
            runOnInit: true
        };
        jobs[task._id] = new CronJob(options)

    }
}


function removeTask(task) {
    jobs[task._id].stop();
    jobs[task._id] = null;
}


function stopTask(task) {
    jobs[task._id].stop();
}

function switchTask(task) {
    let job = jobs[task._id];
    if (job && job.running) {
        job.stop()
    } else {
        job.start()

    }
}