const Task = require('./models/task');
const {getOrderBook} = require('./api');
const Telegram = require('telegraf/telegram');
const telegram = new Telegram(process.env.BOT_TOKEN);
const Extra = require('telegraf/extra');
const _ = require('lodash');
const {getOrderBookType} = require('./utils');

let jobs = {};

const admin = 76207361;
let interval = 60000;

async function startAllTasks() {
    let opt = {
        active: true
    };

    if (process.env.ENV === 'development') {
        // Object.assign(opt, {userId: admin});
        // interval = 1000;
    }

    let tasks = await Task.find(opt);
    tasks = tasks.map(t => {
        return Object.assign(t, {hash: `${t.currency}-${t.exchange}-${t.bookType}`})
    });

    // tasks.forEach((task) => {
    //     let conc = tasks.filter(t => task.hash === t.hash);
    //
    //     if (conc.length > 1) {
    //         task.twin = true
    //     }
    // });
    //
    // tasks = _.filter(tasks, {twin: true});

    const tasksByUsers = {};
    _.each(tasks, t => {
        if (tasksByUsers[t.userId]) tasksByUsers[t.userId].push(t);
        else tasksByUsers[t.userId] = [t]
    });
    for (let prop in tasksByUsers) {
        console.log(prop, tasksByUsers[prop].length)
    }

    let bittrexTasks = _.filter(tasks, {exchange: 'bittrex'});
    let binanceTasks = _.filter(tasks, {exchange: 'binance'});
    let poloniexTasks = _.filter(tasks, {exchange: 'poloniex'});
    console.log(`bittrex tasks now ${bittrexTasks.length}`);
    console.log(`binance tasks now ${binanceTasks.length}`);
    console.log(`poloniex tasks now ${poloniexTasks.length}`);

    console.log(`Starting ${tasks.length} tasks...`);

    tasks.forEach((task, index) => {
        setTimeout(() => startTask(task), index * 100)
        // startTask(task)
    });
}

async function startTask(task) {

    stopTask(task);


    let state = getNewState();

    function getNewState() {
        return {
            previous: 0,
            current: 0,
            currentData: [],
            type: getOrderBookType(task.bookType),
        }
    }


    watchData();

    jobs[task._id] = setInterval(watchData, interval);

    async function watchData() {
        let orderBook = await getOrderBook(task);
        // console.log(orderBook.length, 'cron', new Date());

        if (!orderBook) return;

        let sum = 0;
        let rangePrice;

        state.price = orderBook[0][0];

        // console.log(orderBook)
        orderBook.every((o) => {

            // console.log(Math.abs(((1 - state.price / o[0]) * 100)), o[0])

            if (Math.abs(((1 - state.price / o[0]) * 100)) <= task.priceRange) {
                sum += o[1] * o[0];
                return true;
            } else {
                rangePrice = o[0];
                return false;
            }
        });

        if (task.priceRange === 100 || !rangePrice) {
            rangePrice = orderBook[orderBook.length - 1][0]
        }
        // console.log(sum, rangePrice,);

        state.currentData.push(sum);

        if (state.currentData.length === task.interval) {

            state.previous = state.current;
            state.current = state.currentData.reduce(function (a, b) {
                return a + b;
            }) / task.interval;

            state.currentData = [];

            if (state.previous) {
                handleChange();
            }

        }

        function getMessage(type, change, prev, cur) {
            const header = `〽️️ *${task.exchange.toUpperCase()} ${task.currency}/BTC ${type.toUpperCase()} ${task.interval}m F${task.filterValue + getTypeLabel(task.filterType)}*\n`;
            const prices = `${task.bookType === 1 ? 'Bid' : 'Ask'}: ${state.price}\n`;
            const range = `R${task.priceRange}%: ${rangePrice}\n`;
            const changeLine = `Change: ${change}${getTypeLabel(task.filterType)}\n`;
            const values = `Previous value: ${prev.toFixed(8)}\nCurrent value: ${cur.toFixed(8)}`;
            return `${header}${prices}${range}${changeLine}${values}`;
        }

        function handleChange() {
            let change;
            if (task.filterType === 0) {
                change = ((state.current - state.previous) / state.previous * 100).toFixed(2);
            } else if (task.filterType === 1) {
                change = (state.previous - state.current).toFixed(8);
            }
            if (Math.abs(change) >= task.filterValue) {
                if (task.bookType === 0 || (task.bookType === 1 && state.type === 'buy') || (task.bookType === 2 && state.type === 'sell')) {
                    telegram.sendMessage(
                        task.userId,
                        getMessage(state.type, change, state.previous, state.current, state.price),
                        Extra.markdown()
                    ).catch(err => console.log(err))
                }
            }
        }
    }

    function getTypeLabel(type) {
        switch (type) {
            case 0:
                return '%';
            case 1:
                return 'BTC'
        }
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