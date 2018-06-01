const fetch = require('node-fetch');
const ccxt = require('ccxt');
const {getOrderBookType} = require('./utils');

const HttpsProxyAgent = require('https-proxy-agent');
// const _ = require('lodash');
const Bottleneck = require('bottleneck');

const bittrex = new ccxt.bittrex();
const binance = new ccxt.binance();
const poloniex = new ccxt.poloniex();
const kucoin = new ccxt.kucoin();
const bitfinex = new ccxt.bitfinex();

let proxies = [''
    , 'http://MyWk3P:TB4SmC@185.232.169.111:9110', 'http://6WwC7T:jsw6hZ@185.232.168.169:9741', 'http://P3Mo9t:kgJ9d1@185.232.171.98:9363'
];

const bittrexLimiter = new Bottleneck({
    minTime: 300,
    // maxConcurrent: 1
});
const binanceLimiter = new Bottleneck({
    minTime: 300,
    // maxConcurrent: 3
});

const poloniexLimiter = new Bottleneck({
    minTime: 300,
    // maxConcurrent: 3
});

const bittrexProxyIterator = ProxyIterator(proxies);
const binanceProxyIterator = ProxyIterator(proxies);
const poloniexProxyIterator = ProxyIterator(proxies);


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

    let proxy;
    try {
        if (exchange === 'bittrex') {
            proxy = bittrexProxyIterator.next();
            if (proxy) exchange.agent = new HttpsProxyAgent(proxy);

            data = await bittrexLimiter.schedule(() => bittrex.fetchOrderBook(`${currency}/BTC`, null, {type: bookType}));
        }
        if (exchange === 'binance') {
            proxy = binanceProxyIterator.next();
            if (proxy) exchange.agent = new HttpsProxyAgent(proxy);

            data = await binanceLimiter.schedule(() => binance.fetchOrderBook(`${currency}/BTC`, 1000))
        }
        if (exchange === 'poloniex') {
            proxy = poloniexProxyIterator.next();
            if (proxy) exchange.agent = new HttpsProxyAgent(proxy);

            data = await poloniexLimiter.schedule(() => poloniex.fetchOrderBook(`${currency}/BTC`, 1000))
        }
        // if (exchange === 'kucoin') data = await kucoin.fetchOrderBook(`${currency}/BTC`, null, {limit: 1000});
        // if (exchange === 'bitfinex') data = await bitfinex.fetchOrderBook(`${currency}/BTC`, null, );

        counter++;

    } catch (e) {
        return console.log(e.message)
    }
    // console.log(task.hash, proxy);
    //

    let result;

    if (bookType === 'buy') result = data.bids.length && data.bids;
    if (bookType === 'sell') result = data.asks.length && data.asks;

    // console.log(result.length);
    return result
}



// const exchange = new ccxt.poloniex();
// const proxyIterator = ProxyIterator(proxies);
// let testCounter = 0;
//
// setInterval(async () => {
//     const proxy = proxyIterator.next();
//     if (proxy) exchange.agent = new HttpsProxyAgent(proxy);
//
//     try {
//         // console.log((await exchange.fetchOrderBook('LTC/BTC', 1000)).bids.length, proxy) // polo
//         console.log((await exchange.fetchOrderBook('LTC/BTC', 1000)).bids.length, proxy); // bittrex
//         testCounter++;
//     } catch (e) {
//         console.log(e.message, proxy)
//         // try {
//         //     console.log((await exchange.fetchOrderBook('LTC/BTC', null, {type: 'buy'})).bids.length, proxy)
//         // } catch (e) {
//         //     console.log(e.message, proxy)
//         //
//         //
//         // }
//     }
// }, 300);
//
// setInterval(() => {
//     console.log('REQUESTS PER MIN', counter, testCounter);
//     counter = 0;
//     testCounter = 0;
// }, 60000);


function ProxyIterator(array) {
    let nextIndex = 0;
    let copy = array.slice();

    return {
        next: () => {
            if (nextIndex >= copy.length) nextIndex = 0;
            return copy[nextIndex++]
        }
    }
}


module.exports = {
    getOrderBook
};