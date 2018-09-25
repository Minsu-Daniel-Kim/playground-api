var express = require('express');
var mongoose = require('mongoose');
var randomstring = require("randomstring");

var Project = require('../models/projects');
var Card = require('../models/cards');
var User = require('../models/users');

var router = express.Router();

mongoose.connect(process.env.DATABASE_URL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

function notFound(req, res) {
  res.statusCode = 400;
  res.send({message: `Can't find project: ${req.params.id}`})
}

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
  });
});

router.post('/:id/enroll', function (req, res, next) {
  let projectId = req.params.id
  let userId = req.body.userId
  let staking = req.body.staking
  if (projectId === undefined || userId === undefined || staking === undefined) {
    console.log('here')
    return res.send({message: `invalid argument: ${projectId}, ${userId}, ${staking}`})
  }

  Project.findOne({id: projectId}, function(err, project) {
    if (project === null)
      return res.send({message: `Cant find project: ${projectId}`})
    if (project.enrolled(userId))
      return res.send({message: `Alerady enrolled: ${userId}`})

    project.enroll(userId)
    project.save()

    User.findOne({id: userId}, function(err, user) {
      if (user === null)
        return res.send({message: `Cant find user: ${userId}`})
      if (user.enrolled(pojectId))
        return res.send({message: `Alerady enrolled: ${pojectId}`})

      user.enroll(projetId, staking)
      user.save()
    })
    return res.send({message: `Success to enroll`})
  })
})

router.get('/:id/cards', function(req, res, next) {
  Card.find({projectId: req.params.id}, function (err, cards) {
    if (err) return console.error(err);
    if (cards !== null)
      return res.send(cards.map(card => card.shorten()));
    return res.send({message: `Can't find cards by: ${req.params.id}`});
  });
});

// project에 카드를 생성한다
router.post('/:id/card', function(req, res, next) {
  if (req.body.userId === undefined || req.body.userId === null) {
    res.statusCode = 400
    return res.send({message: "no userId"})
  }

  Project.findOne({id: req.params.id}, function (err, project) {
    if (err) return console.error(err);
    if (project === null) return notFound(req, res)

    new Card({
      id: "card_" + randomstring.generate(8),
      projectId: req.params.id,
      title: getOrDefault(req.body.title, ''),
      description: getOrDefault(req.body.description, ''),
      startedDate: null,
      dueDate: null,
      timeLimit: null,
      point: null,
      assigneeId: null,
      submissionUrl: null,
      ttl: null,
      createdDate:  Date.now(),
      createdBy: req.body.userId,
      state: 'BACKLOG',
      gained: null,
      history: [],
      comments: []
    }).save(function(err, saved) {
      if (err) return res.send(err);
      return res.send({message: "success to register card"});
    });
  });
});

function getOrDefault(value, defaultValue) {
  return value !== undefined ? value : defaultValue;
}

module.exports = router;