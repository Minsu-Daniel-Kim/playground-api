var express = require('express');
var router = express.Router();
var Project = require('../models/projects');
var Card = require('../models/cards');
var mongoose = require('mongoose');

// require('dotenv').load();
mongoose.connect(process.env.DATABASE_URL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

// api for managing
router.get('/', function(req, res, next) {
  Project.find(function (err, projects) {
    if (err) return console.error(err);
    // TODO convert
    return res.send(projects);
  })
});

router.get('/:id', function(req, res, next) {
  Project.findOne({id: req.params.id}, function (err, project) {
    if (err) return console.error(err);
    if (project !== null)
      return res.send(project.to_json());
    return res.send({message: "Can't find project"});
  })
});

router.get('/:id/cards', function(req, res, next) {
  Card.find({projectId: req.params.id}, function (err, cards) {
    if (err) return console.error(err);
    if (cards !== null)
      return res.send(cards.map(card => card.shorten()));
    return res.send({message: `Can't find cards by: ${req.params.id}`});
  })
});


module.exports = router;