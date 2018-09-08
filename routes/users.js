var express = require('express');
var router = express.Router();
var User = require('../models/users');
var mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE_URL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

router.get('/:id', function(req, res, next) {
  User.findOne({id: req.params.id}, function (err, user) {
    if (err) return console.error(err);
    // TODO convert
    return res.send(user.to_json());
  })
});

module.exports = router;