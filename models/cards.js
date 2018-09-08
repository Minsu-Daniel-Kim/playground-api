var mongoose = require('mongoose');

var cardSchema = new mongoose.Schema({
  id : Number,        // or uuid
  title: String,
  description: String,
  comments: Array,
  startedAt: Date,    //
  ttl: Number,        // card countdown time
  point: Number,      // maximum possible gain point

  // Assignee
  assignee: Number,   // assignee id
  staking: Number,    // how much assignee staked
  reference: String,  // jupyter notebook address
  gained: Number,     // how much assignee gained

  // meta information
  createdAt: Date,    // card created time
  createdBy: Number,  // card creator id
  state: String,

  // history
});

cardSchema.methods.shorten = function () {
  return {
    id: this.id,
    title: this.title,
    description: this.description.substr(0, 100),
    state: this.state,
    assignee: this.assignee
  }
}

var Card = mongoose.model('Card', cardSchema);
// var card1 = new Card({ id: 1, title: 'title', description: "description", startedAt: Date.now()});
//   card1.save(function (err, card1) {
//     if (err) return console.error(err);
//     console.log('success to save')
//   });

module.exports = Card;