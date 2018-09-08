var express = require('express');
var router = express.Router();
var StateMachine = require('javascript-state-machine');
var Card = require('../models/cards');
var mongoose = require('mongoose');

// if (process.env.NODE_ENV !== 'production')
require('dotenv').load();
console.log("process.env: " + process.env.NODE_ENV, ",", process.env.DATABASE_URL)

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
    onBeforeReady: function(lifecycle, card, params) {
      console.log('onBeforeReady', params.point)
      if (params.point === undefined || params.point < 0)
        return false
    },
    onReady: function(lifecycle, card, params) {
      console.log('onReady')
      card.point = params.point
      card.ttl = 1440 // one day
    },
    onAssigned: function() {console.log('onAssigned')},
    onSubmited: function() {console.log('onSubmited')},
    onAccepted: function() {console.log('onAccepted')},
    onRejected: function() {console.log('onRejected')},
    onGaveup:   function() {console.log('onGaveup')},
    onTimesup:  function() {console.log('onTimesup')}
  }
});




/* Router */
router.get('/', function(req, res, next) {
  Card.find(function (err, cards) {
    if (err) return console.error(err);
    // TODO convert
    return res.send(cards);
  })
});

router.get('/:id', function(req, res, next) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    // TODO convert
    return res.send(card.shorten());
  })
});

router.post('/:id/state', function(req, res, next) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    // TODO init card's state as Backlog
    if (card.state === undefined)
      card.state = 'Backlog'

    fsm.goto(card.state);
    if (fsm.cannot(req.body.action)) {
      return res.send("Fail to change")
    }
    // Update card's state
    if (fsm[req.body.action](card, req.body) === false) {
      return res.send("Fail to change")
    }

    card.state = fsm.state
    card.save(function (err, saved) {
      if (err) return console.error(err);
      return res.send(saved)
    })
  });
})

router.get('/detail/:id', function(req, res, next) {
  var id = req.query.id;
  res.send('hello world');
});

module.exports = router;
