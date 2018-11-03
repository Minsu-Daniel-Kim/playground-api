let mongoose = require('mongoose');
let randomString = require("randomstring");

// TODO staking과 tokens 분리
// Project apply, end시에만 쌓이는 기록
let schema = new mongoose.Schema({
  id: String,
  userId: String,
  totalAmount: Number,
  histories: [
    {
      sourceId: String,
      projectId: String,
      type: String,
      desc: String,
      amount: Number,
      createdAt: Date
    }
  ],
  createdBy: String,
  createdAt: Date,
  modifiedAt: Date
});

schema.statics.new = function (projectId, userId) {
  return new Staking({
    id: "staking" + randomString.generate(8),
    projectId: projectId,
    userId: userId,
    staking: 0,
    histories: [],
    createdBy: "SYSTEM",
    createdAt: new Date(),
    modifiedAt: new Date()
  })
};

schema.methods.log = function (id, projectId, amount, type, reason) {
  this.staking += amount;
  this.histories.push({
    sourceId: id,
    projectId: projectId,
    type: type, // ENROLL, CARD_ASSIGN, SLASH, TIME_OUT
    desc: reason,
    amount: amount,
    createdAt: new Date()
  });
  return this;
};

let Staking = mongoose.model('Staking', schema);
module.exports = Staking;