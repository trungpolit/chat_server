const path = require("path");
module.exports.LOG_DIR = path.join(__dirname, '..', 'logs', path.sep);

module.exports.MAX_LOG_SIZE = 10 * 1024 * 1024;
module.exports.MAX_LOG_FILES = 100;
module.exports.DEFAULT_PORT = 3000;
module.exports.LOG_INFO_NAME = 'info.log';
module.exports.LOG_EXCEPTION_NAME = 'exceptions.log';
module.exports.SECRET = '123^&asd';
module.exports.TTL = 24*60*60;
module.exports.CHAT_DEFAULT_TYPE = 1;


