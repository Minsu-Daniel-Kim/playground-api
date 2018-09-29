let mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE_URL);
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

module.exports = db;