const express = require('express');
const router = express.Router();
require('../middlewares/jwtValidation');
const {CHAT_DEFAULT_TYPE} = require('../constants/index');
const room = require('../models/room');

router.get('/', function (req, res) {
    console.log('Gọi lấy Room Chat');
    res.header("Access-Control-Allow-Origin", "*");

    let output = {
        status: 'success',
        message: '',
        code: '',
        data: null,
    };

    const user_ids = req.query.user_ids.split(',');
    const type = req.query.type || CHAT_DEFAULT_TYPE;

    room.findOrCreate(type, user_ids, function (err, r) {
        if(err){
            output.status = 'error';
            output.message = err.message;
            output.code = '#ROM001';
            output.data = err;
        }else{
            output.data.id = r._id;
        }
        res.json(output);
    });
});

module.exports = router;
