const {createHmac} = require('crypto');


function getOrderBookType(type) {
    switch (type) {
        case 0:
            return 'both';
        case 1:
            return 'buy';
        case 2:
            return 'sell'
    }
}

function checkSignature({hash, ...data}, secret) {
    const checkString = Object.keys(data)
        .sort()
        .map(k => (`${k}=${data[k]}`))
        .join('\n');
    const hmac = createHmac('sha256', secret)
        .update(checkString)
        .digest('hex');
    return hmac === hash;
}

module.exports = {
    getOrderBookType,
    checkSignature
};