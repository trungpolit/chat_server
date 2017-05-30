const {DEFAULT_PORT} = require('../constants/index');

const express = require('express');
const router = express.Router();

router.get('/', function (req, res) {
    console.log('Gọi lấy chat Server');
    const hostname = req.hostname;
    const output = {
        'error':0,
        'data':{
            'server': 'http://'+hostname+':'+DEFAULT_PORT,
        },
    };
    res.json(output);
});

module.exports = router;
