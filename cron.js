const CronJob = require('cron').CronJob;
const Task = require('./models/task');
const {getOrderBook} = require('./api');
let jobs = {};
const Telegram = require('telegraf/telegram');
const telegram = new Telegram(process.env.BOT_TOKEN);
const Extra = require('telegraf/extra');


async function startAllTasks() {
    let tasks = await Task.find().populate('user');
    tasks.forEach(i => {
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


                buyOrders.forEach((o) => {
                    state.currentBuy += o.Quantity * o.Rate;
                });

                sellOrders.forEach((o) => {
                    state.currentSell += o.Quantity * o.Rate;
                });


                state.changeBuy = ((1 - state.previousBuy / state.currentBuy) * 100).toFixed(2);
                state.changeSell = ((1 - state.previousSell / state.currentSell) * 100).toFixed(2);


                if (Math.abs(state.changeBuy) >= task.filterDepth && state.previousBuy) {
                    let message = `〽️️ *${task.title}*\n➡️ *BUY* order book change *${state.changeBuy}%*\nPrevious value: *${state.previousBuy.toFixed(3)}* BTC\nCurrent value: *${state.currentBuy.toFixed(3)}* BTC`;
                    telegram.sendMessage(task.userId, message, Extra.markdown());

                }

                if (Math.abs(state.changeSell) >= task.filterDepth && state.previousSell) {
                    let message = `〽️️ *${task.title}*\n➡️ *SELL* order book change *${state.changeSell}%*\nPrevious value: *${state.previousSell.toFixed(3)}* BTC\nCurrent value: *${state.currentSell.toFixed(3)}* BTC`;

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