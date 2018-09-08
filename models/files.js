// TODO delete
var mongoose = require('mongoose');

var fileSchema = new mongoose.Schema({
  id : Number,        // or uuid
  cardId: Number,
  title: String,
  content: String,
  createdAt: Date,
  createdBy: Number,
});

var File = mongoose.model('File', fileSchema);
// var File1 = new File({ id: 1, title: 'title', description: "description", startedAt: Date.now()});
//   File1.save(function (err, File1) {
//     if (err) return console.error(err);
//     console.log('success to save')
//   });

module.exports = File;