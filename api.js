const url = 'https://bittrex.com/api/v1.1/public';
const fetch = require('node-fetch');
const ccxt = require('ccxt');
const PromiseThrottle = require('promise-throttle');

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


async function getOrderBook(exchange, market, type) {


        let data;

        if (exchange === 'bittrex') {

            const promiseFunc = () => {
                return new Promise(async (resolve, reject) => {
                    try {
                        const data = await bittrex.fetchOrderBook(`${market}/BTC`, null, {type});
                        resolve(data)
                    } catch (e) {
                        console.log(e.message)
                    }

                });
            };
            data = await bittrexThrottle.add(promiseFunc);
        }
        if (exchange === 'binance') {

            const promiseFunc = () => {
                return new Promise(async (resolve, reject) => {

                    try {
                        const data = await binance.fetchOrderBook(`${market}/BTC`, 1000);
                        resolve(data)
                    } catch (e) {
                        console.log(e.message)
                    }
                });
            };
            data = await binanceThrottle.add(promiseFunc);

        }

        if (!data) {
            console.log('invalid data', exchange, market, type);
            return;
        }

        // console.log(exchange, market, type);

        if (type === 'buy') return data.bids;
        if (type === 'sell') return data.asks


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