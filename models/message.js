const mongoose = require('../config/database');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const messageSchema = new Schema({
    user_id: String,
    room_id: String,
    type: {type: Number, default: 1},
    content: String,
    files: Object,
    seen_by: [{user_id: {type: String}, at: {type: Date, default: Date.now}}],
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now},
    modified: {type: Date, default: Date.now},
});

animalSchema.statics.pushSeenBy = function (user_id, id, seenBy, cb) {
    const found = seenBy.some(function (seen) {
        return seen.user_id === user_id;
    });
    if (!found) {
        seenBy.push({user_id: user_id, at: Date.now()});
        this.update({'_id': id}, {$set: {seen_by: seenBy}}, {multi: false}, cb);
    }else{
        cb(false);
    }
};

const message = mongoose.model('Message', messageSchema);
module.exports = message;
