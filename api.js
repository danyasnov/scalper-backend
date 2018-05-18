const url = 'https://bittrex.com/api/v1.1/public';
const fetch = require('node-fetch');
const ccxt = require('ccxt');
const PromiseThrottle = require('promise-throttle');
const cache = require('memory-cache');

const bittrex = new ccxt.bittrex();
const binance = new ccxt.binance();
const kucoin = new ccxt.kucoin();
const bitfinex = new ccxt.bitfinex();
const poloniex = new ccxt.poloniex();


const bittrexThrottle = new PromiseThrottle({
    requestsPerSecond: 2
});

const binanceThrottle = new PromiseThrottle({
    requestsPerSecond: 2
});
//bittrex 500, один стакан
//binance 1000, оба стакана, передавать глубину вторым аргументом
//kucoin limit не больше 100
//bitfinex null, {limit_bids: 10000, limit_asks: 10000
//poloniex 10000


async function getOrderBook(exchange, market, type, isTwin, id) {


    let timers = {};

    timers[id] = {};


    let data;
    const cacheId = `${exchange}-${market}-${type}`;


    const promiseFunc = () => {
        return new Promise(async (resolve, reject) => {
            timers[id].begin = Date.now();
            const cachedData = cache.get(cacheId);
            // console.log()

            // console.log(cachedData && cachedData.bids.length);
            // console.log(cachedData && cachedData.asks.length);

            if (cachedData) {
                // console.log(cacheId,
                //     'from cache', isTwin ? 'twin' : 'ERROR'
                // );

                if (!isTwin) console.log('CACHE ERROR');

                resolve(cachedData)
            } else {
                let data;
                try {
                    if (exchange === 'bittrex') data = await bittrex.fetchOrderBook(`${market}/BTC`, null, {type});
                    if (exchange === 'binance') data = await binance.fetchOrderBook(`${market}/BTC`, 1000);
                } catch (e) {
                    return console.log(e.message)
                }

                if (data) {
                    // console.log(cacheId,
                    //     'from api'
                    // );
                    // console.log(data.bids.length)
                    // console.log(data.bids.length ? data.bids.length : '');
                    // console.log(data.asks.length ? data.asks.length : '');
                    timers[id].end = Date.now();
                    // console.log(`${(timers[id].end-timers[id].begin)/1000}s`, cacheId)

                    // console.log('cache alive for', 55000-(timers[id].end-timers[id].begin))

                    cache.put(cacheId, data, 55000-(timers[id].end-timers[id].begin));
                    resolve(data)
                }
            }


        });
    };
    data = await bittrexThrottle.add(promiseFunc);


    // if (!data) {
    //     console.log('invalid data', exchange, market, type);
    //     return;
    // }

    // console.log(exchange, market, type);
    let result;

    if (type === 'buy') result = data.bids.length && data.bids;
    if (type === 'sell') result = data.asks.length && data.asks;

    return result

    // } catch (e) {
    //     console.log(e.message)
    // }


}

// setInterval(async function () {
//     try {
//         console.log((await binance.fetchOrderBook(`GET/BTC`, 1000)).bids.length, new Date())
//     } catch (e) {
//         // console.log(e.name)
//         console.log(e.message)
//         // console.log(e.stack)
//     }
// }, 500);


async function getMarkets() {
    const response = await fetch(`${url}/getmarkets`);
    const json = await response.json();
    return json.result
}


module.exports = {
    getMarkets,
    getOrderBook
};