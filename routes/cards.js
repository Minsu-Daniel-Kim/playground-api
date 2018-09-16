var express = require('express');
var router = express.Router();
var StateMachine = require('javascript-state-machine');
var randomstring = require("randomstring");
var mongoose = require('mongoose');

var Card = require('../models/cards');
var agenda = require('../jobs/agenda');
var sendMail = require('../jobs/mailer');

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
      if (params.point === undefined || params.point < 0)
        return false
      card.point = params.point
      card.timeLimit = card.point * 60 * 1000
    },
    onAssigned: function(lifecycle, card, params) {
      if (params.userId === undefined || params.staking === undefined)
        return false;

      card.assigneeId   = params.userId;
      card.staking      = params.staking;
      card.ttl          = card.timeLimit;
      card.remainPoint  = card.point;
      card.startedAt    = Date.now()
      card.dueDate      = Date.now() + card.timeLimit * 1000;
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

router.post('/:id/ready', function(req, res, next) {
  action = 'ready'
  // TODO validate
  return updateCardState(req, res, action)
})

agenda.define('slash', (job, done) => {
  let cardId = job.attrs.data.cardId
  console.log(`slash ${cardId} ${new Date().toLocaleString()}`)
  Card.findOne({id: cardId}, function (err, card) {
    if (err) return console.error(err);
    if (card.currentState() != 'IN_PROGRESS' || card.ttl < 0) {
      done();
      return;
    }
    card.ttl -= 60**2 * 100060
    console.log(`retrigger ${card.ttl}`)

    if (card.ttl > 0) {
      card.remainPoint -= 1
      // TODO slashing
    } else {
      job.remove()
      fsm.goto(card.currentState());
      fsm.timesup(card)
      // TODO staking transfer
    }

    card.save(function (err, saved) {
      if (err) return console.error(err);
      return saved;
    })
    done()
  });
})

router.post('/:id/assign', function(req, res, next) {
  action = 'assigned'
  // TODO validate

  sendMail({
    to: 'email@gmail.com',
    subject: "Card assigned",
    body: "Card is started, Cheers!"
  })
  var job = agenda.create('slash',{cardId: req.params.id})
  job.repeatEvery('1 hour', 'slash', {cardId: req.params.id})
  job.save();

// agenda.now('sendMail', {cardId: req.params.id})
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

// For development
router.post('/:id/reset', function(req, res, next) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    if (card === null) return notFound(req, res)
    card.clear()
    card.state = 'BACKLOG'
    card.save(function (err, saved) {
      if (err) return res.send(err);
      return res.send(saved.detail())
    })
  });
})

router.post('/:id/comment', function(req, res, next) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    if (card === null) return notFound(req, res)

    card.comments.push({
      id: "comment_" + randomstring.generate(8),
      parentId: req.body.parentId,
      title: req.body.title,
      content: req.body.content,
      userId: req.body.userId,
      createdDate: Date.now()})

    card.save(function (err, saved) {
      if (err) return res.send(err);
      return res.send({message: "success to register comment"})
    })
  });
})

module.exports = router;
