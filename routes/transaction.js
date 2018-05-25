const express = require('express');
const router = express.Router();
const {createHash} = require('crypto');
const {checkSignature} = require('../utils');
const Transaction = require('../models/transaction');
const secret = createHash('sha256')
    .update('604799175:AAFBWyd6ey8pidiAai8d1exJzYbG1J3j6og')
    .digest();


router.use((req, res, next) => {
    if (req.query && req.query.auth) {
        const user = JSON.parse(req.query.auth);
        if (checkSignature(user, secret)) {

            req.body.user = user;
            return next()
        }
    }

    res.sendStatus(401);
});


router.get('/', async (req, res) => {

    let transactions = await Transaction.find({userId: req.body.user.id});

    res.send(transactions);
});

router.post('/', async (req, res) => {
    let {privateKey, neo, address} = req.body;
    const obj = {
        userId: req.body.user.id,
        privateKey,
        neo,
        address
    };

    const transaction = new Transaction(obj);


    transaction.save((err, data) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500)
        }
        res.send(data)
    });
});

router.delete('/', (req, res) => {
    const _id = req.query.id;
    Transaction.findByIdAndRemove(_id)
        .then(() => {
            res.sendStatus(200);
        })
});


module.exports = router;