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

module.exports = {
    getOrderBookType
};