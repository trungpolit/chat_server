const {SECRET} = require('../constants/index');
const jwt = require('express-jwt');
const app = require('express')();

module.exports = app.use(jwt({
    secret: SECRET,
    getToken: function fromHeader(req) {
        return req.header('token') || null;
    }
}));