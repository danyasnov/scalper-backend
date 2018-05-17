const mongoose = require('mongoose');

let taskSchema = mongoose.Schema({
    currency: {
        type: String,
        required: true
    },
    interval: {
        type: Number,
        required: true
    },
    userId: {
        type: Number,
        required: true
    },
    active: Boolean,
    filterValue: {
        type: Number,
        required: true
    },
    filterType: {
        type: Number,
        required: true
    },
    bookType: {
        type: Number,
        required: true
    },
    priceRange: {
        type: Number,
        required: true
    },
    exchange: {
        type: String,
        required: true
    }
});


let Task = mongoose.model('Task', taskSchema);

module.exports = Task;