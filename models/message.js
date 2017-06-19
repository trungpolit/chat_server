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

const message = mongoose.model('Message', messageSchema);
module.exports = message;
