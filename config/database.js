const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/linkgo_chat');

module.exports = mongoose;
