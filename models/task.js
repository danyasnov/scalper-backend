const mongoose = require('mongoose');

let taskSchema = mongoose.Schema({
    currency: String,
    interval: Number,
    userId: Number,
    active: Boolean,
    filterValue: Number,
    filterType: Number,
    bookType: Number,
    priceRange: Number,
    exchange: String
});


let Task = mongoose.model('Task', taskSchema);

module.exports = Task;