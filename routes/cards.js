var express = require('express');
var router = express.Router();
var StateMachine = require('javascript-state-machine');
var Card = require('../models/cards');
var mongoose = require('mongoose');


mongoose.connect(process.env.DATABASE_URL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));


// BACKLOG, NOT_STARTED, IN_PROGRESS, IN_REVIEW, COMPLETE
var fsm = new StateMachine({
  init: 'BACKLOG',
  transitions: [
    { name: 'ready',    from: 'BACKLOG',    to: 'NOT_STARTED' },
    { name: 'assigned', from: 'NOT_STARTED', to: 'IN_PROGRESS' },
    { name: 'submitted', from: 'IN_PROGRESS', to: 'IN_REVIEW' },
    { name: 'accepted', from: 'IN_REVIEW',   to: 'COMPLETE' },
    { name: 'rejected', from: 'IN_REVIEW',   to: 'IN_PROGRESS' },
    { name: 'gaveup',   from: 'IN_PROGRESS',   to: 'NOT_STARTED' },
    // TODO go to where?
    { name: 'timesup', from: 'IN_PROGRESS',  to: 'BACKLOG' },
    { name: 'goto', from: '*', to: function(state) { return state } }
  ],
  methods: {
    onReady: function(lifecycle, card, params) {
      console.log('onReady');
      if (params.point === undefined || params.point < 0)
        return false;

      card.point = params.point;
      card.timeLimit = 1440; // TODO set timeLimit based on point
    },
    onAssigned: function(lifecycle, card, params) {
      console.log('onAssigned');
      if (params.userId === undefined || params.staking === undefined)
        return false;

      card.assigneeId = params.userId;
      card.staking = params.staking;
      card.ttl = card.timeLimit;
      card.startedAt = Date.now()
      card.dueDate = Date.now() + card.timeLimit * 1000;
      // TODO add history
      // card.history.add({})
    },
    onSubmitted: function(lifecycle, card, params) {
      console.log('onSubmitted')
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
    if (req.body.url === '') {
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
    if (card === null) return notFound(req, res)
    return res.send(card.shorten());
  })
});

router.get('/:id/detail', function(req, res, next) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    if (card === null) return notFound(req, res)

    if (req.query.fields == 'all') {
      return res.send(card.all())
    }
    return res.send(card.detail())
  });
});

function notFound(req, res) {
  res.statusCode = 400;
  res.send({message: `Can't find card: ${req.params.id}`})
}

function updateCardState(req, res, action) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    if (card === null) return notFound(req, res)

    fsm.goto(card.currentState());
    if (fsm.cannot(action)) {
      return res.send({message: `Card cannot be ${action}. current state: ${card.currentState()}`})
    }
    if (fsm[action](card, req.body) === false) {
      return res.send({message: `Card cannot be ${action}. userId: ${req.body.userId}, staking: ${req.body.staking}`})
    }

    card.state = fsm.state
    card.save(function (err, saved) {
      if (err) return res.send(err);
      return res.send(saved.detail())
    })
  });
}

router.post('/:id/assign', function(req, res, next) {
  action = 'assigned'
  // TODO validate
  return updateCardState(req, res, action)
})

router.post('/:id/giveup', function(req, res, next) {
  action = 'gaveup'
  // TODO validate
  return updateCardState(req, res, action)
})

router.post('/:id/submit', function(req, res, next) {
  action = 'submitted'
  // TODO validate
  return updateCardState(req, res, action)
})

router.post('/:id/accept', function(req, res, next) {
  action = 'accepted'
  // TODO validate
  return updateCardState(req, res, action)
})

router.post('/:id/reject', function(req, res, next) {
  action = 'rejected'
  // TODO validate
  return updateCardState(req, res, action)
})



// TODO Create cards
// var randomstring = require("randomstring");
// router.post('/new', function() {
// });

module.exports = router;
