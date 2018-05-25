// const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const {app} = require('./index');
const express = require('express');
const helmet = require('helmet');


app.use(express.static(path.join(__dirname, 'build')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});


app.use(bodyParser.json());
// app.use(cors());

app.use(helmet());


app.use('/task', require('./routes/task'));
// app.use('/transaction', require('./routes/transaction'));
