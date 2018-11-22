let randomString = require('randomstring');
let mongoose = require('mongoose');

let schema = new mongoose.Schema({
  id: String,
  userId: String,
  transactionId: String,
  status: String,
  createdAt: Date
});

const DELIMITER = "_";

schema.statics.new = function (userId, transactionId, status) {
  return new Transaction({
      id: "transaction" + DELIMITER + randomString.generate(8),
      userId: userId,
      transactionId: transactionId,
      status: status,
      createdAt: new Date()
    }
  );
};

let Transaction = mongoose.model('Transaction', schema);
module.exports = Transaction;
