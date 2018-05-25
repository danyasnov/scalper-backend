const mongoose = require('mongoose');

let schema = mongoose.Schema({
    privateKey: String,
    address: String,
    userId: Number,
    neo: Number,
});

let Transaction = mongoose.model('Transaction', schema);

module.exports = Transaction;