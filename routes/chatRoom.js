const express = require('express');
const router = express.Router();
require('../middlewares/jwtValidation');
const {CHAT_DEFAULT_TYPE} = require('../constants/index');

router.get('/', function (req, res) {
    console.log('Gọi lấy Room Chat');
    res.header("Access-Control-Allow-Origin", "*");



    res.json(output);
});

module.exports = router;
