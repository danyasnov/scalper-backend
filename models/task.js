const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let taskSchema = mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    title: String,
    interval: Number,
    userId: Number,
    active: Boolean,
    depthFilter: Number
});


let Task = mongoose.model('Task', taskSchema);

module.exports = Task;