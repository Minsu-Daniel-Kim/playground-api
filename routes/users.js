var express = require('express');
var router = express.Router();
var User = require('../models/users');
var mongoose = require('mongoose');

require('dotenv').load();
mongoose.connect(process.env.DATABASE_URL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

router.get('/', function(req, res, next) {
  User.find(function (err, users) {
    if (err) return console.error(err);
    // TODO convert
    return res.send(users);
  })
});

router.get('/:id', function(req, res, next) {
  User.findOne({id: req.params.id}, function (err, user) {
    if (err) return console.error(err);
    if (user !== null)
      return res.send(user.to_json());
    return res.send({message: "Can't find user"})
  })
});

module.exports = router;