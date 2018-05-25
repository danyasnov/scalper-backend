const cors = require('cors');
const Task = require('./models/task');
const {createHash, createHmac} = require('crypto');
const bodyParser = require('body-parser');
const path = require('path');
const {app} = require('./index');
const express = require('express');
const {startTask, stopTask} = require('./cron');
const _ = require('lodash');
const helmet = require('helmet');

const secret = createHash('sha256')
    .update(process.env.BOT_TOKEN)
    .digest();

const allowedIds = [76207361, 335413418, 124225687, 190265500, 126841094, 168034495, 307224012, 546555767];

app.use(express.static(path.join(__dirname, 'build')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});


app.use(bodyParser.json());
app.use(cors());

app.use(helmet());
app.use((req, res, next) => {
    if (req.query && req.query.auth) {
        const user = JSON.parse(req.query.auth);

        if (checkSignature(user) && allowedIds.indexOf(user.id) !== -1) {
            req.body.user = user;
            return next()
        }
    }

app.use('/task', require('./routes/task'));
app.use('/transaction', require('./routes/transaction'));
