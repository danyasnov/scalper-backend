const express = require('express');
const app = express();
const cors = require('cors');
const Task = require('./models/task');
const {createHash, createHmac} = require('crypto');
const bodyParser = require('body-parser');
const path = require('path');


const secret = createHash('sha256')
    .update(process.env.BOT_TOKEN)
    .digest();

function checkSignature({hash, ...data}) {
    const checkString = Object.keys(data)
        .sort()
        .map(k => (`${k}=${data[k]}`))
        .join('\n');
    const hmac = createHmac('sha256', secret)
        .update(checkString)
        .digest('hex');
    return hmac === hash;
}

app.use(express.static(path.join(__dirname, 'build')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.use(bodyParser.json());
app.use(cors());
app.use((req, res, next) => {
    const user = JSON.parse(req.query.auth);

    if (checkSignature(user)) {
        req.body.user = user;
        next()
    } else {
        res.sendStatus(401)
    }
});


app.get('/task', async (req, res) => {
    let tasks = await Task.find({userId: req.body.user.id});

    res.send(tasks);
});

app.post('/task', async (req, res) => {
    let {currency, interval, filterType, filterValue, active, bookType, _id} = req.body;
    const obj = {currency, interval, filterType, filterValue, active, bookType, userId: req.body.user.id, _id};
    if (obj._id) {
        Task.findOneAndUpdate({_id}, obj, {new: true})
            .then((data) => {
                res.send(data)
            })
    } else {
        const task = new Task(obj);
        console.log(task);
        task.save((err, data) => {
            if (err) {
                res.sendStatus(500)
            }
            res.send(data)
        });
    }

});

app.delete('/task', (req, res) => {
    console.log(req.query.id);
    Task.findByIdAndRemove(req.query.id)
        .then(() => {
            // if (err) {
            //     console.log(err);
            //     return res.sendStatus(500)
            // }
            res.sendStatus(200)
        })
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));

module.exports = app;