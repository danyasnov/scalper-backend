const url = 'https://bittrex.com/api/v1.1/public';
const fetch = require('node-fetch');
const ccxt = require('ccxt');
const PromiseThrottle = require('promise-throttle');
const cache = require('memory-cache');
const {getOrderBookType} = require('./utils');

const bittrex = new ccxt.bittrex();
const binance = new ccxt.binance();
const kucoin = new ccxt.kucoin();
const bitfinex = new ccxt.bitfinex();
const poloniex = new ccxt.poloniex();

let cacheTime = 55000;

if (process.env.ENV === 'development') cacheTime = 15000;

const bittrexThrottle = new PromiseThrottle({
    requestsPerSecond: 2
});

const binanceThrottle = new PromiseThrottle({
    requestsPerSecond: 2
});

const bitfinexThrottle = new PromiseThrottle({
    requestsPerSecond: 1.5
});
//bittrex 500, один стакан
//binance 1000, оба стакана, передавать глубину вторым аргументом
//kucoin limit не больше 100
//bitfinex null, {limit_bids: 10000, limit_asks: 10000
//poloniex 10000


async function getOrderBook(task) {
    const {exchange, currency, twin, _id} = task;

    const bookType = getOrderBookType(task.bookType);

    let timers = {};

    timers[_id] = {};

    let data;
    const cacheId = `${exchange}-${currency}-${bookType}`;
    // console.log(cacheId, process.env.ENV === 'development')

    const promiseFunc = () => {
        return new Promise(async (resolve, reject) => {
            timers[_id].begin = Date.now();
            const cachedData = cache.get(cacheId);


            if (cachedData) {
                // console.log(cacheId,
                //     'from cache', isTwin ? 'twin' : 'ERROR'
                // );

                if (!twin) console.log('CACHE ERROR');

                resolve(cachedData)
            } else {
                let data;
                try {
                    // console.log(exchange, currency, getOrderBookType(bookType))
                    if (exchange === 'bittrex') data = await bittrex.fetchOrderBook(`${currency}/BTC`, null, {type: bookType});
                    if (exchange === 'binance') data = await binance.fetchOrderBook(`${currency}/BTC`, 1000);
                    // if (exchange === 'kucoin') data = await kucoin.fetchOrderBook(`${currency}/BTC`, null, {limit: 1000});
                    if (exchange === 'bitfinex') data = await bitfinex.fetchOrderBook(`${currency}/BTC`, null, {limit_bids: 10000, limit_asks: 10000});
                } catch (e) {
                    return console.log(e.message)
                }
                // console.log(data)

                if (data) {
                    // console.log(cacheId,
                    //     'from api'
                    // );

                    timers[_id].end = Date.now();

                    // console.log(55000-(timers[_id].end-timers[_id].begin))

                    cache.put(cacheId, data, cacheTime-(timers[_id].end-timers[_id].begin));
                    resolve(data)
                }
            }


        });
    };
    if (exchange === 'bittrex') data = await bittrexThrottle.add(promiseFunc);
    if (exchange === 'binance') data = await binanceThrottle.add(promiseFunc);
    if (exchange === 'bitfinex') data = await bitfinexThrottle.add(promiseFunc);

    let result;

    if (bookType === 'buy') result = data.bids.length && data.bids;
    if (bookType === 'sell') result = data.asks.length && data.asks;

    return result

}

// setInterval(async function () {
//     try {
//         console.log((await bitfinex.fetchOrderBook(`ETH/BTC`, null, {limit_bids: 100000, limit_asks: 100000})).bids.length, new Date())
//     } catch (e) {
//         console.log(e.message)
//     }
// }, 1500);


async function getMarkets() {
    const response = await fetch(`${url}/getmarkets`);
    const json = await response.json();
    return json.result
}


module.exports = {
    getMarkets,
    getOrderBook
};