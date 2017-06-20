const mongoose = require('../config/database');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const roomSchema = new Schema({
    server: String,
    type: {type: Number, default: 1},
    users: {type: Array},
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now},
    modified: {type: Date, default: Date.now},
});

roomSchema.statics.findOrCreate = function (type, user_ids, cb) {
    this.findOneAndUpdate({
        $or: [{
            'users.0': user_ids[0],
            'users.1': user_ids[1],
        },
            {
                'users.0': user_ids[1],
                'users.1': user_ids[0],
            }]
    }, {
        $set: {
            type: type,
            users: user_ids,
            modified: Date.now()
        }
    }, {
        upsert: true,
        setDefaultsOnInsert: true,
        new: true,
    }, cb);
};

const room = mongoose.model('Room', roomSchema);
module.exports = room;
