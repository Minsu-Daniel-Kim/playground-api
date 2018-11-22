let User = require('../models/users');
let Transaction = require('../models/transactions');
let express = require('express');
let router = express.Router();


router.post('/save', function (req, res) {
  let userId = req.body.userId;
  let transactionId = req.body.transactionId;
  let status = req.body.status;

  User.findOne({id: userId})
    .then(function (user) {
      if (user === null || user === undefined)
        return res.send(404, {message: `Can't find user ${userId}`});

      Transaction.new(userId, transactionId, status)
        .save()
        .then(function (saved) {
          return res.send(saved);
        })
        .catch(function (e) {
          console.error(e);
          res.send(500, `Something went wrong ${e.toString()}`);
        });
    })
    .catch(function (e) {
      console.error(e);
      res.send(500, {message: `Something went wrong: ${e.toString()}`});
    });
});

module.exports = router;