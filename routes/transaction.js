const express = require('express');
const router = express.Router();
const {createHash} = require('crypto');
const {checkSignature} = require('../utils');
const Transaction = require('../models/transaction');
const secret = createHash('sha256')
    .update('604799175:AAFBWyd6ey8pidiAai8d1exJzYbG1J3j6og')
    .digest();

// const Neon = require('@cityofzion/neon-js');
// const intent = Neon.api.makeIntent({NEO: 1}, 'ASTVHALyYxZ1Z8uuS3yKjghmwDq8ZA1Kgn');
// const config = {
//     net: 'MainNet',
//     address: 'AJXSALTHkiEngXy6Jwo8qNryKnK44FFvr6',
//     privateKey: 'L1nUabJfBx2Z59RA6PzLcEydQhe1X4ymTLTAgftNLrtxwNBF9z4T',
//     intents: intent
// };
// Neon.api.sendAsset(config)
//     .then(config => {
//         console.log(config.response)
//     })
//     .catch(config => {
//         console.log(config)
//     })


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