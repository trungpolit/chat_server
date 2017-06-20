const {
    MAX_LOG_SIZE,
    MAX_LOG_FILES,
    DEFAULT_PORT,
    LOG_INFO_NAME,
    LOG_EXCEPTION_NAME,
    LOG_DIR,
    SECRET,
} = require('./constants/index');

const chatServer = require('./routes/chatServer');
const chatRoom = require('./routes/chatRoom');
const jwtToken = require('./routes/jwtToken');

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

app.use(require("morgan")("combined", {"stream": logger.stream}));

const jwt = require('express-jwt');
app.use(jwt({
    secret: SECRET,
    getToken: function fromHeader(req) {
        return req.header('token') || null;
    }
}).unless({path: ['/getRefreshToken']}));

app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        code: '#UNK001',
        message: err.message,
        data: err.stack,
    });
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.use('/getChatServer', chatServer);
app.use('/getChatRoom', chatRoom);
app.use('/getRefreshToken', jwtToken);

// Thực hiện test
app.get('/saveRoom', function (req, res) {
    console.log('Query:');
    console.log(req.query);
    const user_ids = req.query.user_ids.split(',');
    const type = req.query.type;
    const room = require('./models/room');
    room.findOrCreate(type, user_ids, function (err, r) {
        if (err) {
            res.send(err);
        }
        res.send(r);
    });
});

io.on('connection', function (socket) {
    logger.info('a user connected');

    // Thực hiện join vào phòng chat 1-1
    socket.on('join_room', function (msg, fn) {
        const room_id = msg.room_id || null;
        if (!room_id) {
            return socket.emit('socketerror', {code: '#SOC001', message: 'room_id is empty.', data: null});
        }
        socket.join(room_id);

        // Thông báo tới sender đã join vào room thành công
        const output = {code: 0, message: '', data: {room_id: room_id}};
        fn(output);
    });

    // Thực hiện gửi tin nhắn tới người nhận
    socket.on('send_message', function (msg, fn) {
        const room_id = msg.room_id || null;
        if (!room_id) {
            return socket.emit('socketerror', {code: '#SOC002', message: 'room_id is empty.', data: null});
        }

        const message = require('./models/message');
        message.create({
            user_id: socket.handshake.decoded_token.user_id,
            room_id: room_id,
            type: 1,
            content: msg.content,
            files: null,
            seen_by: null,
        }, function (err, message) {
            if (err) {
                return socket.emit('socketerror', {code: '#SOC003', message: 'message cant be saved.', data: null});
            } else {
                // Thực hiện gửi message tới receiver
                msg.message_id = message._id;
                socket.broadcast.to(room_id).emit('receive_message', msg);

                // Thông báo tới sender là message đã được gửi đi
                const output = {code: 0, message: '', data: {message_id: msg.message_id}};
                fn(output);
            }
        });

    });

    // Thực đánh dấu message đã được xem (seen)
    socket.on('seen_message', function (msg) {
        const room_id = msg.room_id || null;
        const message_id = msg.message_id || null;
        const user_id = socket.handshake.decoded_token.user_id;

        if (!room_id || !message_id) {
            return socket.emit('socketerror', {
                code: '#SOC004',
                message: 'room_id or message_id is empty.',
                data: null
            });
        }

        // Thực hiện lấy ra message
        const message = require('./models/message');
        message.findOne({room_id: room_id, message_id: message_id}).then(function (message) {
            if (!message) {
                return socket.emit('socketerror', {
                    code: '#SOC005',
                    message: 'message doesnt exists.',
                    data: null
                });
            }
            const seenBy = message.seen_by || [];
            this.pushSeenBy(user_id, message_id, seenBy, function (err) {
                if (!err) {
                    return socket.emit('socketerror', {
                        code: '#SOC007',
                        message: err.message,
                        data: err
                    });
                }
            });
        }).catch(function (err) {
            socket.emit('socketerror', {
                code: '#SOC006',
                message: err.message,
                data: err
            });
        });

    });
});

http.listen(port, function () {
    logger.info('listening on *:' + port);
});