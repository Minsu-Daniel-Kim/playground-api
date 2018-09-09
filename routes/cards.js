var express = require('express');
var router = express.Router();
var StateMachine = require('javascript-state-machine');
var Card = require('../models/cards');
var mongoose = require('mongoose');


mongoose.connect(process.env.DATABASE_URL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));


// Backlog, NotStarted, InProgress, InReview, Complete
var fsm = new StateMachine({
  init: 'Backlog',
  transitions: [
    { name: 'ready',    from: 'Backlog',    to: 'NotStarted' },
    { name: 'assigned', from: 'NotStarted', to: 'InProgress' },
    { name: 'submited', from: 'InProgress', to: 'InReview' },
    { name: 'accepted', from: 'InReview',   to: 'Complete' },
    { name: 'rejected', from: 'InReview',   to: 'InProgress' },
    { name: 'gaveup',   from: 'InReview',   to: 'NotStarted' },
    // TODO go to where?
    { name: 'timesup', from: 'InProgress',  to: 'Backlog' },
    { name: 'goto', from: '*', to: function(state) { return state } }
  ],
  methods: {
    onReady: function(lifecycle, card, params) {
      console.log('onReady');
      if (params.point === undefined || params.point < 0)
        return false;

      card.point = params.point;
      // TODO set ttl based on point
      card.timeLimit = 1440;
      card.ttl = 1440;
    },
    onAssigned: function(lifecycle, card, params) {
      console.log('onAssigned');
      if (params.assigneeId === undefined || params.staking === undefined)
        return false;

      card.assigneeId = params.assigneeId;
      card.staking = params.staking;
      card.startedAt = Date.now()
      // TODO add history
      // card.history.add(new History({}))
    },
    onSubmited: function(lifecycle, card, params) {
      console.log('onSubmited')
      // TODO stop countdown
      card.ttl = card.dueDate - Date.now()
    },
    onAccepted: function(lifecycle, card, params) {
      console.log('onAccepted')
      card.gained = params.point
      // TODO add point to assignee
    },
    onRejected: function(lifecycle, card, params) {
      console.log('onRejected')
      // TODO start countdown
    },
    onGaveup:   function(lifecycle, card, params) {
      console.log('onGaveup')
      card.clear()
    },
    onTimesup:  function(lifecycle, card, params) {
      console.log('onTimesup')
      card.clear()
    }
  }
});

/* Router */
// For management
router.get('/', function(req, res, next) {
  Card.find(function (err, cards) {
    if (err) return console.error(err);
    return res.send(cards);
  })
});


router.post('/:id/submission', function(req, res, next) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    if (req.body.url === undefined) {
      res.statusCode = 400;
      return res.send({message: 'Url is empty'})
    }

    card.submissionUrl = req.body.url
    card.save(function (err, saved) {
      if (err) return res.send(err);
      return res.send(saved.detail())
    })
  });
})

router.get('/:id', function(req, res, next) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    if (card === null) {
      res.statusCode = 400;
      return res.send({message: `Can't find card: ${req.params.id}`})
    }
    return res.send(card.shorten());
  })
});

router.post('/:id/state', function(req, res, next) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    // TODO init card's state as Backlog
    fsm.goto(card.currentState());
    if (fsm.cannot(req.body.action)) {
      return res.send(`Fail to action: ${req.body.action}`)
    }
    // Update card's state
    if (fsm[req.body.action](card, req.body) === false) {
      return res.send(`Fail to action: ${req.body.action}`)
    }

    card.state = fsm.state
    card.save(function (err, saved) {
      if (err) return res.send(err);
      return res.send(saved.detail())
    })
  });
})

router.get('/:id/detail', function(req, res, next) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    console.log(req)
    if (req.query.fields == 'all') {
      return res.send(card.all())
    }
    return res.send(card.detail())
  });
});


// TODO Create cards
// var randomstring = require("randomstring");
// router.post('/new', function() {

// });

module.exports = router;
