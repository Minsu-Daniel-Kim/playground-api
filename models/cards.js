var mongoose = require('mongoose');

var cardSchema = new mongoose.Schema({
  // TODO auto generated id
  id : Number,            // or uuid
  title: String,
  description: String,
  comments: Array,
  startedDate: Date,
  dueDate: Date,
  timeLimit: Number,
  point: Number,          // maximum possible gain point

  // Assignee
  assigneeId: Number,       // assignee id
  staking: Number,        // how much assignee staked
  submissionUrl: String,  // jupyter notebook address
  gained: Number,         // how much assignee gained
  ttl: Number,            // card countdown time

  // meta information
  createdDate: Date,    // card created time
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
    assigneeId: this.assignee
  }
}

cardSchema.methods.detail = function () {
  // TODO add more fields
  return {
    id: this.id,
    title: this.title,
    description: this.description,
    state: this.state,
    assigneeId: this.assigneeId,
    point: this.point,
    submissionUrl: this.submissionUrl
  }
}

cardSchema.methods.all = function () {
  return {
    id : this.id,
    title: this.title,
    description: this.description,
    comments: this.comments,
    startedDate: this.startedDate,
    ttl: this.ttl,
    point: this.point,
    assigneeId: this.assigneeId,
    staking: this.staking,
    submissionUrl: this.submissionUrl,
    gained: this.gained,
    createdDate: this.createdDate,
    createdBy: this.createdBy,
    state: this.state,
  }
}

cardSchema.methods.clear = function () {
  this.startedDate = null
  this.assigneeId = null
  this.staking = null
  this.submissionUrl = null
  this.ttl = -1
}

var Card = mongoose.model('Card', cardSchema);
// var card1 = new Card({ id: 1, title: 'title', description: "description", startedAt: Date.now()});
//   card1.save(function (err, card1) {
//     if (err) return console.error(err);
//     console.log('success to save')
//   });

// TODO card status

module.exports = Card;