const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let userSchema = mongoose.Schema({
    _id: Schema.Types.ObjectId,
    id: {
        type: Number,
        unique: true
    },
    first_name: String,
    last_name: String,
    username: String
});


let User = mongoose.model('User', userSchema);

module.exports = User;