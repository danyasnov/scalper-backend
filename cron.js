const Task = require('./models/task');
const {getOrderBook} = require('./api');
const Telegram = require('telegraf/telegram');
const telegram = new Telegram(process.env.BOT_TOKEN);
const Extra = require('telegraf/extra');
const cache = require('memory-cache');

let jobs = {};

const admin = 76207361;

async function startAllTasks() {
    let opt = {
        active: true
    };

    if (process.env.ENV === 'development') {
        Object.assign(opt, {userId: admin})
        // let uniqueArray = tasks.map(t => t.currency).filter(function(item, pos, self) {
        //     return self.indexOf(item) === pos;
        // });
        // console.log(uniqueArray.length);
    }

    let tasks = await Task.find(opt);

    tasks.forEach((task, index) => {
        setTimeout(() => startTask(task), index * 1000)
    });
    console.log(`Starting ${tasks.length} tasks...`)
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


    jobs[task._id] = setInterval(watchData, 6000);

    async function watchData() {

        let orderBook = cache.get(`${task.currency}`);

        if (!orderBook) {
            orderBook = await getOrderBook(`BTC-${task.currency}`, 'both');
            cache.put(`${task.currency}`, orderBook, 60000)
        }


        const {buy: buyOrders, sell: sellOrders} = orderBook;

        let sumBuy = 0;
        let sumSell = 0;

        // console.log('initial ', buyOrders[0].Rate, ((1-buyOrders[0].Rate/buyOrders[99].Rate)*100).toFixed(2));

        buyState.price = buyOrders[0].Rate;
        sellState.price = sellOrders[0].Rate;

        let sumTest = 0;

        buyOrders.forEach((o) => {
            if (Math.abs(((1 - buyState.price / o.Rate) * 100)) <= task.priceRange) {
                sumBuy += o.Quantity * o.Rate;
            } else {
                return false;
            }
        });

        sellOrders.forEach((o) => {
            if (Math.abs(((1 - sellState.price / o.Rate) * 100)) <= task.priceRange) {
                sumSell += o.Quantity * o.Rate;
            } else {
                return false;
            }

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

        function getMessage(type, change, prev, cur) {
            const header = `〽️️ *BTC-${task.currency} ${type.toUpperCase()} ${task.interval}m R${task.priceRange}% F${task.filterValue + getTypeLabel()}*\n`;
            const prices = `Bid: ${buyState.price}\nAsk: ${sellState.price}\n`;
            const changeLine = `Change: ${change}${getTypeLabel()}\n`;
            const values = `Previous value: ${prev.toFixed(8)} BTC\nCurrent value: ${cur.toFixed(8)} BTC`;
            return `${header}${prices}${changeLine}${values}`;
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
                        getMessage(state.type, change, state.previous, state.current, state.price),
                        Extra.markdown()
                    );
                }
            }
        }

        function getTypeLabel() {
            return task.filterType === 0 ? '%' : 'BTC'
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