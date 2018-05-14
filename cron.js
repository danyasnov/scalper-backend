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


    let state = getNewState();

    function getNewState() {
        return {
            previous: 0,
            current: 0,
            currentData: [],
            type: getOrderBookType(task.bookType)
        }
    }


    jobs[task._id] = setInterval(watchData, 60000);

    async function watchData() {

        let orderBook = cache.get(`${task.currency}`);

        if (!orderBook) {
            orderBook = await getOrderBook(`BTC-${task.currency}`, state.type);
            if (!orderBook) return;
            cache.put(`${task.bookType}-${task.currency}`, orderBook, 60000)
        }


        let sum = 0;
        let rangePrice;
        state.price = orderBook[0].Rate;

        orderBook.every((o) => {
            if (Math.abs(((1 - state.price / o.Rate) * 100)) <= task.priceRange) {
                sum += o.Quantity * o.Rate;
                return true;
            } else {

                rangePrice = o.Rate;
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
            const header = `〽️️ *BTC-${task.currency} ${type.toUpperCase()} ${task.interval}m F${task.filterValue + getTypeLabel(task.filterType)}*\n`;
            const prices = `${task.bookType === 1 ? 'Bid' : 'Ask'}: ${state.price}\n`;
            const range = `R${task.priceRange}%: ${rangePrice}\n`;
            const changeLine = `Change: ${change}${getTypeLabel(task.filterType)}\n`;
            const values = `Previous value: ${prev.toFixed(8)} BTC\nCurrent value: ${cur.toFixed(8)} BTC`;
            return `${header}${prices}${rangePrice ? range : ''}${changeLine}${values}`;
        }

        function handleChange() {
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