let mongoose = require('mongoose');
let randomString = require("randomstring");

let schema = new mongoose.Schema({
  id: String,
  cardId: String,
  userId: String,
  url: String,
  citations: [{
    cardId: String,
    sourceId: String,   // submission's id
    createdAt: Date
  }],
  cited: [{
    cardId: String,
    sourceId: String,   // submission's id
    createdAt: Date,
  }],
  createdAt: Date,
  createdBy: String,  // card creator id
});

const DELIMITER = "_";

schema.statics.new = function (cardId, submissionUrl, userId) {
  return new Submission({
    id: "submission" + DELIMITER + randomString.generate(8),
    cardId: cardId,
    userId: userId,
    url: submissionUrl,
    citations: [],
    cited: [],
    createdAt: new Date(),
    createdBy: userId
  });
};

schema.methods.cite = function (cardId, submissionId) {
  this.citations.push({
    cardId: cardId,
    sourceId: submissionId,
    createdAt: new Date()
  });
  return this;
};

schema.methods.logCited = function (cardId, submissionId) {
  this.cited.push({
    cardId: cardId,
    sourceId: submissionId,
    createdAt: new Date()
  });
  return this;
};

let Submission = mongoose.model('Submission', schema);
module.exports = Submission;
