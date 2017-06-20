const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {SECRET, TTL} = require('../constants/index');

router.get('/', function (req, res) {
    console.log('Gọi lấy refresh Token');
    res.header("Access-Control-Allow-Origin", "*");

    let output = {
        status: 'success',
        message: '',
        code: 0,
        data: null,
    };

    const user_id = req.query.user_id || null;
    if (!user_id) {
        output.status = 'error';
        output.message = 'user_id is empty.';
        output.code = '#TOK001';
        output.data = null;
        return res.json(output);
    }

    const token = jwt.sign({
        user_id: user_id
    }, SECRET, {expiresIn: TTL});

    output.data = {token: token};
    return res.json(output);
});

module.exports = router;
