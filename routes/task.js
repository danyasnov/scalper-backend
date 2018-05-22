const express = require('express');
const router = express.Router();
const {createHash} = require('crypto');
const {checkSignature} = require('../utils');
const {startTask, stopTask} = require('../cron');
const Task = require('../models/task');

const secret = createHash('sha256')
    .update(process.env.BOT_TOKEN)
    .digest();

const allowedIds = [76207361, 335413418, 124225687, 190265500, 126841094, 168034495, 307224012, 546555767];

router.use((req, res, next) => {
    if (req.query && req.query.auth) {
        const user = JSON.parse(req.query.auth);
        if (checkSignature(user, secret) && allowedIds.indexOf(user.id) !== -1) {
            req.body.user = user;
            return next()
        }
    }

    res.sendStatus(401);
});


router.get('/', async (req, res) => {
    let tasks = await Task.find({userId: req.body.user.id});

    res.send(tasks);
});

router.post('/', async (req, res) => {
    let {currency, interval, filterType, filterValue, active, bookType, _id, priceRange, exchange} = req.body;
    const obj = {
        currency,
        interval,
        filterType,
        filterValue,
        active,
        bookType,
        userId: req.body.user.id,
        _id,
        priceRange,
        exchange
    };
    if (obj._id) {
        Task.findOneAndUpdate({_id}, obj, {new: true})
            .then((data) => {
                res.send(data);
                startTask(data);
            })
    } else {
        const task = new Task(obj);

        task.save((err, data) => {
            if (err) {
                res.sendStatus(500)
            }
            startTask(data);
            res.send(data)
        });
    }


});

router.delete('/', (req, res) => {
    const _id = req.query.id;
    Task.findByIdAndRemove(_id)
        .then(() => {
            res.sendStatus(200);
            stopTask({_id})
        })
});


module.exports = router;