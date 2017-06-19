const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const co = require('co');

const roomSchema = new Schema({
    server: String,
    type: {type: Number, default: 1},
    user: ObjectId,
    friend: ObjectId,
    users: [{user_id: ObjectId, at: Date, socket_id: String}],
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now},
    modified: {type: Date, default: Date.now},
});

roomSchema.statics.findOrCreate = function (type, user, friend, cb) {
    co(function*() {
        let result;
        try {
            result = yield this.findOne({type: type, user: user, friend: friend}).exec();
        } catch (e) {
            return cb(e);
        }
        let roomData = {};
    }());

};
