const mongoose = require('mongoose');
const randomString = require("randomstring");


let schema = new mongoose.Schema({
  id: String,
  projectId: String,
  userId: String,
  totalAmount: Number,
  ledgers: [{
    cardId: String,
    staked: Number,
    consumed: Number,
    histories: [{
      // amount: Number,
      // type: String, // STAKING, SLASH
      // createdAt: Date
    }],
  }],
  histories: [{
    // amount: Number,
    // type: String,
    // createdAt: Date
  }],
  createdBy: String,
  createdAt: Date,
  modifiedAt: Date
});

schema.statics.new = function (projectId, userId) {
  return new Token({
    id: "token" + randomString.generate(8),
    projectId: projectId,
    userId: userId,
    totalAmount: 0,
    ledgers: [],
    histories: [],
    createdBy: "SYSTEM",
    createdAt: new Date(),
    modifiedAt: new Date()
  })
};

schema.methods.findOrCreateLedger = function (cardId) {
  let ledger = this.ledgers.find(e => e.cardId === cardId);
  if (ledger === undefined) {
    ledger = {
      cardId: cardId,
      staked: 0,
      consumed: 0,
      histories: []
    };
    this.ledgers.push(ledger);
    return this.ledgers.find(e => e.cardId === cardId);
  }
  return ledger;
};

schema.methods.stake = function (cardId, amount) {
  let ledger = this.findOrCreateLedger(cardId);
  this.totalAmount -= amount;
  ledger.staked += amount;
  ledger.histories.push({
    amount: amount,
    type: "STAKING",
    createdAt: new Date()
  });
  return this;
};

schema.methods.slash = function (cardId, amount) {
  let ledger = this.findOrCreateLedger(cardId);
  ledger.slashed += amount;
  ledger.histories.push({
    amount: amount,
    type: "SLASH",
    createdAt: new Date()
  });
  return this;
};

schema.methods.consumeStake = function (cardId) {
  let ledger = this.findOrCreateLedger(cardId);
  let left = ledger.staked - ledger.consumed;
  ledger.consumed += left;
  ledger.histories.push({
    amount: left,
    type: "REJECTED",
    createdAt: new Date()
  });
  return this;
};

/**
 * 카드가 accept 되거나 Asignee가 카드를 포기한 경우 token을 돌려준다
 * @param cardId
 * @param type ACCEPTED or GIVE_UP
 * @returns {mongoose.Schema.methods}
 */
schema.methods.returnStake = function (cardId, type) {
  let ledger = this.findOrCreateLedger(cardId);
  let left = ledger.staked - ledger.consumed;
  this.totalAmount += left;
  ledger.staked -= left;
  ledger.histories.push({
    amount: left,
    type: type,
    createdAt: new Date()
  });
  return this;
};

let Token = mongoose.model('Token', schema);
module.exports = Token;