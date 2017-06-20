const {
    MAX_LOG_SIZE,
    MAX_LOG_FILES,
    DEFAULT_PORT,
    LOG_INFO_NAME,
    LOG_EXCEPTION_NAME,
    LOG_DIR,
    SECRET,
} = require('./constants/index');

// http - api
const express = require('express');
const app = express();
const http = require('http').Server(app);
const jwt = require('express-jwt');

// socket - chat
const io = require('socket.io')(http);
const socketioJwt = require('socketio-jwt');

const morgan = require('morgan');
const argv = require('yargs').argv;
const port = argv.p || DEFAULT_PORT;
const path = require('path');

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

const chatServer = require('./routes/chatServer');
const chatRoom = require('./routes/chatRoom');
const jwtToken = require('./routes/jwtToken');

app.use(require("morgan")("combined", {"stream": logger.stream}));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(jwt({
    secret: SECRET,
    getToken: function fromHeader(req) {
        return req.header('token') || null;
    }
}).unless({path: ['/getRefreshToken', '/', '/public/*']}));

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
    res.sendFile(__dirname + '/public/index.html');
});

app.use('/getRefreshToken', jwtToken);
app.use('/getChatServer', chatServer);
app.use('/getChatRoom', chatRoom);

io.use(socketioJwt.authorize({
    secret: SECRET,
    handshake: true
}));

io.on('connection', function (socket) {
    logger.info('a user connected');

    // Thực hiện join vào phòng chat 1-1
    socket.on('join_room', function (msg, fn) {
        logger.info('join_room: Có sự kiện tham gia vào phòng chat join_room');
        logger.info(msg);

        const room_id = msg.room_id || null;
        if (!room_id) {
            logger.info('join_room: msg thiếu thông tin room_id');
            return socket.emit('socketerror', {code: '#SOC001', message: 'room_id is empty.', data: null});
        }
        socket.join(room_id);

        // Thông báo tới sender đã join vào room thành công
        logger.info('join_room: Thực hiện thông báo tới sender đã tham gia thành công room_id="%s"', room_id);
        const output = {code: 0, message: '', data: {room_id: room_id}};
        fn(output);
    });

    // Thực hiện gửi tin nhắn tới người nhận
    socket.on('send_message', function (msg, fn) {
        logger.info('send_message: Có sự kiện gửi send_message');
        logger.info(msg);

        const room_id = msg.room_id || null;
        if (!room_id) {
            logger.info('send_message: msg thiếu thông tin room_id');
            return socket.emit('socketerror', {code: '#SOC002', message: 'room_id is empty.', data: null});
        }

        const message = require('./models/message');
        message.create({
            user_id: socket.decoded_token.user_id,
            room_id: room_id,
            type: 1,
            content: msg.content,
            files: null,
            seen_by: null,
        }, function (err, message) {
            if (err) {
                logger.error('send_message: Thực hiện lưu msg lỗi');
                logger.error(err.stack);
                return socket.emit('socketerror', {code: '#SOC003', message: 'message cant be saved.', data: null});
            } else {
                // Thực hiện gửi message tới receiver
                logger.info('send_message: Thực hiện gửi msg message_id="%s" tới receiver room_id="%s" - kích hoạt sự kiện receive_message tại receiver', msg.message_id, room_id);
                msg.message_id = message._id;
                socket.broadcast.to(room_id).emit('receive_message', msg);

                // Thông báo tới sender là message đã được gửi đi
                logger.info('send_message: Thực hiện thông báo tới sender đã gửi thành công msg message_id="%s" tới receiver room_id="%s"', msg.message_id, room_id);
                const output = {code: 0, message: '', data: {message_id: msg.message_id, room_id: room_id}};
                fn(output);
            }
        });

    });

    // Thực đánh dấu message đã được xem (seen)
    socket.on('seen_message', function (msg, fn) {
        logger.info('seen_message: Có sự kiện đánh dấu đã xem (seen)');
        logger.info(msg);

        const room_id = msg.room_id || null;
        const message_id = msg.message_id || null;
        const user_id = socket.decoded_token.user_id;

        if (!room_id || !message_id) {
            logger.info('seen_message: msg thiếu thông tin room_id hoặc message_id');
            return socket.emit('socketerror', {
                code: '#SOC004',
                message: 'room_id or message_id is empty.',
                data: null
            });
        }

        // Thực hiện lấy ra message
        const message = require('./models/message');
        message.identify(message_id, room_id).then(function (msg) {
            if (!msg) {
                logger.info('seen_message: Không tìm thấy message tương ứng với room_id="%s", message_id="%s"', room_id, message_id);
                return socket.emit('socketerror', {
                    code: '#SOC005',
                    message: 'message doesnt exists.',
                    data: null
                });
            }
            const seenBy = msg.seen_by || [];
            message.pushSeenBy(user_id, message_id, seenBy, function (err) {
                if (err) {
                    logger.error('seen_message: Lỗi khi đánh dấu message_id="%s" được seen bởi user_id="%s"', message_id, user_id);
                    logger.error(err.stack);
                    return socket.emit('socketerror', {
                        code: '#SOC007',
                        message: err.message,
                        data: err
                    });
                }

                // Thông báo tới sender là message đã được gửi đi
                logger.info('seen_message: Thực hiện thông báo tới sender đã seen thành công msg message_id="%s", room_id="%s"', message_id, room_id);
                const output = {code: 0, message: '', data: {message_id: message_id, room_id: room_id}};
                fn(output);
            });
        }).catch(function (err) {
            logger.error('seen_message: Lỗi khi xác định message tương ứng với room_id="%s", message_id="%s"', room_id, message_id);
            logger.error(err.stack);
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