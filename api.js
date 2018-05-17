const url = 'https://bittrex.com/api/v1.1/public';
const fetch = require('node-fetch');
const ccxt = require('ccxt');

const bittrex = new ccxt.bittrex();
const binance = new ccxt.binance();
const kucoin = new ccxt.kucoin();
const bitfinex = new ccxt.bitfinex();
const poloniex = new ccxt.poloniex();

//bittrex 500, один стакан
//binance 1000, оба стакана, передавать глубину вторым аргументом
//kucoin limit не больше 100
//bitfinex null, {limit_bids: 10000, limit_asks: 10000
//poloniex 10000


async function getOrderBook(exchange, market, type) {

    try {

        let data;

        if (exchange === 'bittrex') data = await bittrex.fetchOrderBook(`${market}/BTC`, null, {type});
        if (exchange === 'binance') data = await binance.fetchOrderBook(`${market}/BTC`, 1000);

        if (!data) {
            console.log('invalid task', exchange, market, type);
            return;
        }

        if (type === 'buy') return data.bids;
        if (type === 'sell') return data.asks

    } catch (e) {
        console.log(e)
    }



}


async function getMarkets() {
    const response = await fetch(`${url}/getmarkets`);
    const json = await response.json();
    return json.result;
}



module.exports = {
    getMarkets,
    getOrderBook
};