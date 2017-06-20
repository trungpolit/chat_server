const express = require('express');
const router = express.Router();
const {CHAT_DEFAULT_TYPE, SECRET} = require('../constants/index');

router.get('/', function (req, res) {
    console.log('Gọi lấy Room Chat');
    res.header("Access-Control-Allow-Origin", "*");

    let output = {
        status: 'success',
        message: '',
        code: 0,
        data: null,
    };

    if (!req.query.user_ids) {
        output.status = 'error';
        output.message = 'user_ids is empty.';
        output.code = '#ROM001';
        return res.json(output);
    }

    const user_id = req.user.user_id;
    const user_ids = [user_id, ...req.query.user_ids.split(',')];
    const user_unique_ids =  user_ids.filter((v, i, a) => a.indexOf(v) === i);

    const type = req.query.type || CHAT_DEFAULT_TYPE;


    const room = require('../models/room');
    room.findOrCreate(type, user_unique_ids, function (err, r) {
        if (err) {
            output.status = 'error';
            output.message = err.message;
            output.code = '#ROM002';
            output.data = err;
        } else {
            output.data = {
                room_id: r._id
            }
        }
        res.json(output);
    });
});

module.exports = router;
