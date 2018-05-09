const CronJob = require('cron').CronJob;
const Task = require('./models/task');
const {getOrderBook} = require('./api');
const Telegram = require('telegraf/telegram');
const telegram = new Telegram(process.env.BOT_TOKEN);
const Extra = require('telegraf/extra');

let jobs = {};


async function startAllTasks() {
    let tasks = await Task.find({userId: 76207361});
    tasks.forEach(i => {
        startTask(i)
    })
}


function startTask(task) {
    let job = jobs[task._id];

    let buyState = getNewState();
    let sellState = getNewState();

    function getNewState() {
        return {
            current: 0,
            previous: 0,
            change: 0,
            currentData: []
        }
    }

    if (job) {
        job.start()
    } else {
        const options = {
            cronTime: `1 * * * * *`,
            onTick: async function () {
                const orderBook = await getOrderBook(`BTC-${task.currency}`, 'both');

                const buyOrders = orderBook.buy;
                const sellOrders = orderBook.sell;

                buyState.previos = buyState.current;
                sellState.previos = sellState.current;

                buyState.current = 0;
                sellState.current = 0;


                buyOrders.forEach((o) => {
                    buyState.current += o.Quantity * o.Rate;
                });

                sellOrders.forEach((o) => {
                    sellState.current += o.Quantity * o.Rate;
                });

                buyState.currentData.push(buyState.current);
                sellState.currentData.push(sellState.current);

                if (buyState.currentData.length === task.interval || sellState.currentData.length === task.interval) {

                    const sumBuy = buyState.currentData.reduce(function (a, b) {
                        return a + b;
                    });
                    const sumSell = sellState.currentData.reduce(function (a, b) {
                        return a + b;
                    });

                    buyState.previos = buyState.current;
                    sellState.previos = sellState.current;

                    buyState.current = sumBuy / task.interval;
                    sellState.current = sumSell / task.interval;

                    if (buyState.previos) {
                        if (task.filterType === 0) {
                            buyState.change = ((1 - buyState.previos / buyState.current) * 100).toFixed(2);
                        } else {
                            buyState.change = (buyState.previos - buyState.current).toFixed(8);
                        }

                        if (Math.abs(buyState.change) >= task.filterValue) {
                            if (task.bookType === 0 || task.bookType === 1) {
                                telegram.sendMessage(task.userId, getSignalMessage('BUY', buyState.change, buyState.previos, buyState.current), Extra.markdown());
                            }
                        }
                        if (Math.abs(sellState.change) >= task.filterValue) {
                            if (task.bookType === 0 || task.bookType === 2) {
                                telegram.sendMessage(task.userId, getSignalMessage('SELL', sellState.change, sellState.previos, sellState.current), Extra.markdown());
                            }
                        }
                    }

                    buyState.currentData = [];
                    sellState.currentData = [];
                }

                function getSignalMessage(type, change, prev, cur) {
                    return `〽️️ *BTC-${task.currency}*\n➡️ *${type}* order book change *${change}${task.filterType === 0 ? '%' : 'BTC'}*\nPrevious value: *${prev.toFixed(8)}* BTC\nCurrent value: *${cur.toFixed(8)}* BTC`;

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

module.exports = {
    startAllTasks,
    stopTask,
    startTask,
    switchTask,
    removeTask
};