const Task = require('./models/task');
const {getOrderBook} = require('./api');
const Telegram = require('telegraf/telegram');
const telegram = new Telegram(process.env.BOT_TOKEN);
const Extra = require('telegraf/extra');
const cache = require('memory-cache');

let jobs = {};

const admin = 76207361;
let interval = 60000;

async function startAllTasks() {
    let opt = {
        active: true
    };

    if (process.env.ENV === 'development') {
        // Object.assign(opt, {userId: admin});
        interval = 3000;
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


    let state = getNewState();

    function getNewState() {
        return {
            previous: 0,
            current: 0,
            currentData: [],
            type: getOrderBookType(task.bookType)
        }
    }


    jobs[task._id] = setInterval(watchData, interval);

    async function watchData() {
        const cacheId = `${task.exchange}-${task.bookType}-${task.currency}`;

        let orderBook = cache.get(cacheId);

        if (!orderBook) {
            orderBook = await getOrderBook(task.exchange, task.currency, state.type);

            if (!orderBook || (orderBook && !orderBook.length)) return;
            cache.put(cacheId, orderBook, interval)
        }


        let sum = 0;
        let rangePrice;

        state.price = orderBook[0][0];

        orderBook.every((o) => {

            if (Math.abs(((1 - state.price / o[0]) * 100)) <= task.priceRange || task.priceRange === 100) {
                sum += o[1] * o[0];
                return true;
            } else {

                rangePrice = o[0];
                return false;
            }
        });

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
            const header = `〽️️ *${task.exchange.toUpperCase()} BTC-${task.currency} ${type.toUpperCase()} ${task.interval}m F${task.filterValue + getTypeLabel(task.filterType)}*\n`;
            const prices = `${task.bookType === 1 ? 'Bid' : 'Ask'}: ${state.price}\n`;
            const range = `R${task.priceRange}%: ${rangePrice}\n`;
            const changeLine = `Change: ${change}${getTypeLabel(task.filterType)}\n`;
            const values = `Previous value: ${prev.toFixed(8)} BTC\nCurrent value: ${cur.toFixed(8)} BTC`;
            return `${header}${prices}${rangePrice ? range : ''}${changeLine}${values}`;
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

    function getOrderBookType(type) {
        switch (type) {
            case 0:
                return 'buy';
            case 1:
                return 'buy';
            case 2:
                return 'sell'
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