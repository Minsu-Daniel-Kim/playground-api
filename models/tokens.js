const mongoose = require('mongoose');
const randomString = require("randomstring");


let schema = new mongoose.Schema({
  id: String,
  projectId: String,
  userId: String,
  totalAmount: Number,
  histories: [
    {
      sourceId: String,
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
  return new Token({
    id: "token" + randomString.generate(8),
    projectId: projectId,
    userId: userId,
    staking: 0,
    histories: [],
    createdBy: "SYSTEM",
    createdAt: new Date(),
    modifiedAt: new Date()
  })
};

schema.methods.log = function (id, amount, type, reason) {
  this.staking += amount;
  this.histories.push({
    sourceId: id,
    type: type, // ENROLL, CARD_ASSIGN, SLASH, TIME_OUT
    desc: reason,
    amount: amount,
    createdAt: new Date()
  });
  return this;
};

let Token = mongoose.model('Token', schema);
module.exports = Token;