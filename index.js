const {
    MAX_LOG_SIZE,
    MAX_LOG_FILES,
    DEFAULT_PORT,
    LOG_INFO_NAME,
    LOG_EXCEPTION_NAME,
    LOG_DIR,
} = require('./constants/index');

const chatServer = require('./routes/chatServer');

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const morgan = require('morgan');
const argv = require('yargs').argv;
const port = argv.p || DEFAULT_PORT;

const winston = require('winston');
const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({json: false, timestamp: true}),
        new winston.transports.File({
            filename: LOG_DIR + LOG_INFO_NAME,
            json: false,
            maxsize: MAX_LOG_SIZE,
            maxFiles: MAX_LOG_FILES
        })
    ],
    exceptionHandlers: [
        new (winston.transports.Console)({json: false, timestamp: true}),
        new winston.transports.File({
            filename: LOG_DIR + LOG_EXCEPTION_NAME,
            json: false,
            maxsize: MAX_LOG_SIZE,
            maxFiles: MAX_LOG_FILES
        })
    ],
    exitOnError: false
});

logger.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};

app.use(require("morgan")("combined", { "stream": logger.stream }));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.use('/getChatServer', chatServer);

let count = 0;
io.on('connection', function (socket) {
    logger.info('a user connected');
    socket.on('chat message', function (msg) {
        logger.info('message: ' + msg);
        count++;
        io.emit('chat message', 'message no' + count);
    });
});

http.listen(port, function () {
    logger.info('listening on *:' + port);
});