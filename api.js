const url = 'https://bittrex.com/api/v1.1/public';
const fetch = require('node-fetch');
const ccxt = require('ccxt');
const cache = require('memory-cache');
const {getOrderBookType} = require('./utils');
// const log = require('ololog')
// const ansi = require('ansicolor').nice
// const asTable = require('as-table')
// console.log(bittrex.rateLimit)
// const kucoin = new ccxt.kucoin();
// const poloniex = new ccxt.poloniex();
const HttpsProxyAgent = require('https-proxy-agent');
const cloudscraper = require('cloudscraper');
const _ = require('lodash');
const binance = new ccxt.binance();
const Bottleneck = require('bottleneck');
let cacheTime = 30000;

let proxies = [''
    ,'http://MyWk3P:TB4SmC@185.232.169.111:9110', 'http://6WwC7T:jsw6hZ@185.232.168.169:9741'
];

const bittrexLimiter = new Bottleneck({
    minTime: 500,
    // maxConcurrent: 1
});
const binanceLimiter = new Bottleneck({
    minTime: 500,
    // maxConcurrent: 3
});

const bittrexProxyIterator = ProxyIterator(proxies);
const binanceProxyIterator = ProxyIterator(proxies);


// if (process.env.ENV === 'development') cacheTime = 10000;


//bittrex 500, один стакан
//binance 1000, оба стакана, передавать глубину вторым аргументом
//kucoin limit не больше 100
//bitfinex null, {limit_bids: 10000, limit_asks: 10000
//poloniex 10000
let counter = 0;

async function getOrderBook(task) {

    const {exchange, currency, twin, _id} = task;

    const bookType = getOrderBookType(task.bookType);

    let data;
    const cacheId = `${exchange}-${currency}-${bookType}`;

    const cachedData = cache.get(cacheId);


    if (cachedData) {
        // console.log(cacheId,
        //     'from cache', twin ? 'twin' : 'ERROR'
        // );

        if (!twin) console.log('CACHE ERROR');

        data = cachedData
    } else {
        let proxy;
        try {
            // console.log(`${currency}/BTC`, null, {type: bookType})
            if (exchange === 'bittrex') {
                const exchange = new ccxt.bittrex();
                proxy = bittrexProxyIterator.next();
                if (proxy) exchange.agent = new HttpsProxyAgent(proxy);

                data = await bittrexLimiter.schedule(() => exchange.fetchOrderBook(`${currency}/BTC`, null, {type: bookType}));
            }
            if (exchange === 'binance') {
                const exchange = new ccxt.binance();
                proxy = binanceProxyIterator.next();
                if (proxy) exchange.agent = new HttpsProxyAgent(proxy);

                data = await binanceLimiter.schedule(() => binance.fetchOrderBook(`${currency}/BTC`, 1000))
            }
            // if (exchange === 'kucoin') data = await kucoin.fetchOrderBook(`${currency}/BTC`, null, {limit: 1000});
            // if (exchange === 'bitfinex') data = await bitfinex.fetchOrderBook(`${currency}/BTC`, null, {
            //     limit_bids: 10000,
            //     limit_asks: 10000
            // });
            // console.log(cacheId, proxy);

            counter++;

        } catch (e) {
            return console.log(e.message)
        }

        if (data) {
            cache.put(cacheId, data, cacheTime);
        } else {
            return console.log('no data', data);

        }

    }

    let result;

    if (bookType === 'buy') result = data.bids.length && data.bids;
    if (bookType === 'sell') result = data.asks.length && data.asks;

    return result
}


async function getMarkets() {
    const response = await fetch(`${url}/getmarkets`);
    const json = await response.json();
    return json.result
}

// setInterval(() => {
//     console.log('REQUESTS PER MIN', counter);
//     counter = 0;
// }, 60000)


function ProxyIterator(array) {
    let nextIndex = 0;
    let copy = array.slice();

    return {
        next: () => {
            if (nextIndex >= copy.length) nextIndex = 0;
            return copy[nextIndex++]
        },
        // remove: (proxy) => {
        //     var index = copy.indexOf(proxy);
        //     if (index > -1) {
        //         copy.splice(index, 1);
        //         console.log('spliced array length', copy.length)
        //     }
        // }
    }
}


module.exports = {
    getMarkets,
    getOrderBook
};