const {
    MAX_LOG_SIZE,
    MAX_LOG_FILES,
    DEFAULT_PORT,
    LOG_INFO_NAME,
    LOG_EXCEPTION_NAME,
    LOG_DIR,
} = require('./constants/index');

const chatServer = require('./routes/chatServer');
const chatRoom = require('./routes/chatRoom');

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
    write: function (message, encoding) {
        logger.info(message);
    }
};

const message = require('./models/message');

app.use(require("morgan")("combined", {"stream": logger.stream}));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.use('/getChatServer', chatServer);
app.use('/getChatRoom', chatRoom);

// Thực hiện test
const room = require('./models/room');
app.get('/saveRoom', function (req, res) {
    console.log('Query:');
    console.log(req.query);
    const user_ids = req.query.user_ids.split(',');
    const type = req.query.type;
    room.findOrCreate(type, user_ids, function (err, r) {
        if (err) {
            res.send(err);
        }
        res.send(r);
    });
})

io.on('connection', function (socket) {
    logger.info('a user connected');
    // Thực hiện join vào phòng chat 1-1
    socket.on('join_chat_room', function (msg) {
        const room_id = msg.room_id || null;
        if (!room_id) {
            return socket.emit('socketerror', {code: '#SOC001', message: 'room_id is empty.'});
        }
        socket.join(room_id);
    });
    // Thực hiện gửi tin nhắn tới người nhận
    socket.on('chat_message', function (msg) {
        const room_id = msg.room_id || null;
        if (!room_id) {
            return socket.emit('socketerror', {code: '#SOC002', message: 'room_id is empty.'});
        }

        message.create({
            user_id: socket.handshake.decoded_token.user_id,
            room_id: room_id,
            type: 1,
            content: msg.content,
            files: null,
            seen_by: null,
        }, function (err,message) {
            if (err) {
                return socket.emit('socketerror', {code: '#SOC003', message: 'message cant save.'});
            } else {
                msg.message_id = message._id;
                socket.broadcast.to(room_id).emit('chat_message', msg);
            }
        })

    })
});

http.listen(port, function () {
    logger.info('listening on *:' + port);
});