const url = 'https://bittrex.com/api/v1.1/public';
const fetch = require('node-fetch');

async function getOrderBook(market = 'BTC-LTC', type = 'both') {
    const response = await fetch(`${url}/getorderbook?market=${market}&type=${type}`);
    const json = await response.json();
    return json.result;

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