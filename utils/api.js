const url = 'https://bittrex.com/api/v1.1/public';
const fetch = require('node-fetch');
const _ = require('lodash');


let prevBuySum = 0;
let prevSellSum = 0;
let currentSellSum = 0;
let currentBuySum = 0;
let change;



// async function getOrderBook (market = 'BTC-LTC', type = 'both') {
//     const response = await fetch(`${url}/getorderbook?market=${market}&type=${type}`);
//     const json = await response.json();
//
//     let buyOrders = json.result.buy;
//     let sellOrders = json.result.sell;
//
//     prevBuySum = currentBuySum;
//     prevSellSum = currentBuySum;
//
//     currentBuySum = 0;
//     currentSellSum = 0;
//
//     _.each(buyOrders, (o) => {
//         currentBuySum += o.Quantity * o.Rate;
//     });
//
//     change = ((1 - prevBuySum / currentBuySum) * 100).toFixed(2);
//
//     if (Math.abs(change) >= 1 && prevBuySum) {
//         console.log('\n');
//         console.log(market);
//         console.log('Prev sum: ', prevBuySum);
//         console.log('Current sum: ', currentBuySum);
//         console.log('Change: ', change, '%')
//     }
// }

async function getOrderBook (market = 'BTC-LTC', type = 'both') {
    const response = await fetch(`${url}/getorderbook?market=${market}&type=${type}`);
    const json = await response.json();
    return json.result;
    // let buyOrders = json.result.buy;
    // let sellOrders = json.result.sell;
    //
    // prevBuySum = currentBuySum;
    // prevSellSum = currentBuySum;
    //
    // currentBuySum = 0;
    // currentSellSum = 0;
    //
    // _.each(buyOrders, (o) => {
    //     currentBuySum += o.Quantity * o.Rate;
    // });
    //
    // change = ((1 - prevBuySum / currentBuySum) * 100).toFixed(2);
    //
    // if (Math.abs(change) >= 1 && prevBuySum) {
    //     console.log('\n');
    //     console.log(market);
    //     console.log('Prev sum: ', prevBuySum);
    //     console.log('Current sum: ', currentBuySum);
    //     console.log('Change: ', change, '%')
    // }
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