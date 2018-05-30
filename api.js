const url = 'https://bittrex.com/api/v1.1/public';
const fetch = require('node-fetch');
const ccxt = require('ccxt');
const cache = require('memory-cache');
const {getOrderBookType} = require('./utils');
// const log = require('ololog')
// const ansi = require('ansicolor').nice
// const asTable = require('as-table')
const bittrex = new ccxt.bittrex();
const binance = new ccxt.binance({enableRateLimit: true});
// console.log(bittrex.rateLimit)
// const kucoin = new ccxt.kucoin();
// const bitfinex = new ccxt.bitfinex({enableRateLimit: true});
// const poloniex = new ccxt.poloniex();
const Bottleneck = require('bottleneck');
let cacheTime = 30000;


const bittrexLimiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 1000
});
const binanceLimiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 1200
});

let proxies = [
    '',
    'https://cors-anywhere.herokuapp.com/',
    'https://crossorigin.me/',
]

// if (process.env.ENV === 'development') cacheTime = 10000;


//bittrex 500, один стакан
//binance 1000, оба стакана, передавать глубину вторым аргументом
//kucoin limit не больше 100
//bitfinex null, {limit_bids: 10000, limit_asks: 10000
//poloniex 10000


async function getOrderBook(task) {

    const {exchange, currency, twin, _id} = task;

    const bookType = getOrderBookType(task.bookType);

    // let proxies = [
    //     '',
    //     'https://cors-anywhere.herokuapp.com/',
    //     'https://crossorigin.me/',
    // ];


    let data;
    const cacheId = `${exchange}-${currency}-${bookType}`;

    // let begin;
    const cachedData = cache.get(cacheId);
    // let currentProxy = 0
    // let maxRetries   = proxies.length;

    if (cachedData) {
        // console.log(cacheId,
        //     'from cache', twin ? 'twin' : 'ERROR'
        // );

        if (!twin) console.log('CACHE ERROR');

        data = cachedData
    } else {

        try {
            // console.log(`${currency}/BTC`, null, {type: bookType})
            if (exchange === 'bittrex') {
                data = await bittrexLimiter.schedule(() => bittrex.fetchOrderBook(`${currency}/BTC`, null, {type: bookType}));
            }
            if (exchange === 'binance') data = await binanceLimiter.schedule(() => binance.fetchOrderBook(`${currency}/BTC`, 1000));
            // if (exchange === 'kucoin') data = await kucoin.fetchOrderBook(`${currency}/BTC`, null, {limit: 1000});
            // if (exchange === 'bitfinex') data = await bitfinex.fetchOrderBook(`${currency}/BTC`, null, {
            //     limit_bids: 10000,
            //     limit_asks: 10000
            // });
            // console.log(cacheId)


        } catch (e) {
            return console.log(e.message)
        }

        if (data) {
            // const end = Date.now();
            // console.log(cacheId);

            // console.log('cache time ',cacheTime);
            cache.put(cacheId, data, cacheTime);
            // return data
        } else {
            return console.log('no data', data);

        }

    }

    let result;

    if (bookType === 'buy') result = data.bids.length && data.bids;
    if (bookType === 'sell') result = data.asks.length && data.asks;

    return result

}

function proxyRequest() {

}


// setInterval(async function () {
//     try {
//         // console.log(bittrex.fetchOrderBook(`LTC/BTC`, null, {type: 'buy'}));
//
//         const res = await bittrexLimiter.schedule(() => bittrex.fetchOrderBook(`LTC/BTC`, null, {type: 'buy'}));
//         console.log(res.bids.length, new Date())
//     } catch (e) {
//         console.log(e.message)
//     }
// }, 100);
//
// const exchange = new ccxt.bitfinex({enableRateLimit: true});
// const repeat = 900;
// let errorsCounter = 0;
// let counter = 0;
// exchange.rateLimit += 400; //bitfinex
// console.log(exchange.rateLimit);
//
//
// async function test(symbol) {
//     let proxies = [
//         '',
//         'https://cors-anywhere.herokuapp.com/',
//         'https://crossorigin.me/',
//     ];
//
//     for (let i = 0; i < repeat; i++) {
//         try {
//             let ticker = await exchange.fetchTicker(symbol);
//             counter++;
//             log(exchange.id, exchange.iso8601(exchange.milliseconds()), ticker['datetime'], symbol.green, ticker['last'], counter, errorsCounter)
//         } catch (e) {
//             errorsCounter++;
//             console.log(e.message)
//         }
//
//     }
// }
//
// const concurrent = [
//     test('ZEC/BTC'),
//     test('XRP/BTC'),
//     test('BCH/ETH')
// ];
//
// Promise.all(concurrent);


async function getMarkets() {
    const response = await fetch(`${url}/getmarkets`);
    const json = await response.json();
    return json.result
}


module.exports = {
    getMarkets,
    getOrderBook
};