let mongoose = require('mongoose');
let randomString = require("randomstring");

let schema = new mongoose.Schema({
  id: String,
  cardId: String,
  url: String,
  citations: [{
    cardId: String,
    sourceId: String,   // submission's id
  }],
  cited: [{
    cardId: String,
    sourceId: String,   // submission's id
  }],
  createdAt: Date,
  createdBy: String,  // card creator id
});

const DELIMITER = "_";

schema.statics.new = function (cardId, submissionUrl) {
  return new Submission({
    id: "submission" + DELIMITER + randomString.generate(8),
    cardId: cardId,
    url: submissionUrl,
    citations: [],
    cited: [],
    createdAt: new Date(),
  });
};

let Submission = mongoose.model('Submission', schema);
module.exports = Submission;
