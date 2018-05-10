const Task = require('./models/task');
const {getOrderBook} = require('./api');
const Telegram = require('telegraf/telegram');
const telegram = new Telegram(process.env.BOT_TOKEN);
const Extra = require('telegraf/extra');

let jobs = {};


async function startAllTasks() {
    let tasks = await Task.find({active: true});
    tasks.forEach(i => {
        startTask(i);
    });

}


function startTask(task) {
    stopTask(task);

    let buyState = getNewState('buy');
    let sellState = getNewState('sell');
    let counter = 0;

    function getNewState(type) {
        return {
            previous: 0,
            current: 0,
            currentData: [],
            type
        }
    }


    jobs[task._id] = setInterval(watchData, 60000);

    async function watchData() {

        const orderBook = await getOrderBook(`BTC-${task.currency}`, 'both');
        const {buy: buyOrders, sell: sellOrders} = orderBook;

        let sumBuy = 0;
        let sumSell = 0;

        buyOrders.forEach((o) => {
            sumBuy += o.Quantity * o.Rate;
        });
        sellOrders.forEach((o) => {
            sumSell += o.Quantity * o.Rate;
        });

        buyState.currentData.push(sumBuy);
        sellState.currentData.push(sumSell);
        counter++;

        if (counter === task.interval) {

            buyState.previous = buyState.current;
            buyState.current = buyState.currentData.reduce(function (a, b) {
                return a + b;
            }) / task.interval;

            sellState.previous = sellState.current;
            sellState.current = sellState.currentData.reduce(function (a, b) {
                return a + b;
            }) / task.interval;

            buyState.currentData = [];
            sellState.currentData = [];
            counter = 0;

            if (buyState.previous) {
                handleChange(buyState);
            }

            if (sellState.previous) {
                handleChange(sellState);
            }
        }
    }

    function getMessage(type, change, prev, cur) {
        return `〽️️ *BTC-${task.currency} ${type.toUpperCase()} ${task.interval}m ${task.filterValue + getTypeLabel()}*\nOrder book change ${change}${getTypeLabel()}\nPrevious value: ${prev.toFixed(8)} BTC\nCurrent value: ${cur.toFixed(8)} BTC`;
    }

    function handleChange(state) {
        let change;
        if (task.filterType === 0) {
            change = ((1 - state.previous / state.current) * 100).toFixed(2);
        } else if (task.filterType === 1) {
            change = (state.previous - state.current).toFixed(8);
        }
        if (Math.abs(change) >= task.filterValue) {
            if (task.bookType === 0 || (task.bookType === 1 && state.type === 'buy') || (task.bookType === 2 && state.type === 'sell')) {
                telegram.sendMessage(
                    task.userId,
                    getMessage(state.type, change, state.previous, state.current),
                    Extra.markdown()
                );
            }
        }
    }

    function getTypeLabel() {
        return task.filterType === 0 ? '%' : 'BTC'
    }
}


function stopTask(task) {
    clearInterval(jobs[task._id]);
    delete jobs[task._id];
}

function switchTask(task) {

    if (!task.active) {
        stopTask(task)
    } else {
        startTask(task)
    }
}

module.exports = {
    startAllTasks,
    stopTask,
    switchTask,
    startTask
};