var express = require('express');
var router = express.Router();
var randomstring = require("randomstring");
var mongoose = require('mongoose');
var moment = require('moment');

var Card = require('../models/cards');
var cardState = require('../models/constant');
var agenda = require('../jobs/agenda');
var mailer = require('../jobs/mailer');
var fsm = require('../tasks/cardstate');

mongoose.connect(process.env.DATABASE_URL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

const _MS_PER_HOUR = 1000 * 60 * 60;

// TODO move to jobs dir
agenda.define('slash', (job, done) => {
  console.log(`slash ${job.attrs.data.cardId} ${new Date().toLocaleString()}`)
  Card.findOne({id: job.attrs.data.cardId})
  .then(function(card) {
    if (card.currentState() != 'IN_PROGRESS' || card.ttl < 0) {
      job.remove()
      done();
      return;
    }

    card.ttl -= _MS_PER_HOUR
    if (card.ttl > 0) {
      card.remainPoint -= 1
      // TODO slashing
    } else {
      fsm.goto(card.currentState());
      fsm.timesup(card)
      job.remove()
      // TODO staking transfer
    }
    card.save(function (err, saved) {
      if (err) return console.error(err);
      return saved;
    })
    done()
  })
  .catch(function(error){
    console.error(error)
  })
})

agenda.define('notiExpiration', (job, done) => {
  let cardId = job.attrs.data.cardId
  let userId = job.attrs.data.userId

  Card.findOne({id: cardId}, function (err, card) {
    if (err) return console.error(err);
    if (card.currentState() == 'IN_PROGRESS' && card.ttl > 0) {
      mailer.notiExpiration(card, userId)
    }
    done();
  });
})
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

router.post('/:id/assign', function(req, res, next) {
  action = 'assigned'
  // TODO validate
  var job = agenda.create('slash', {cardId: req.params.id})
  job.repeatEvery('1 hour', { skipImmediate: true })
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
    card.state = cardState.BACK_LOG
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

router.post('/:id/rate', function(req, res, next) {
  Card.findOne({id: req.params.id})
  .then(function (card) {
    console.log(`${card.currentState()} ${cardState.BACK_LOG}`)
    if (card.currentState() !== cardState.IN_REVIEW)
      return res.send({message: `Can't rate card state: ${card.currentState()}`})
    // TODO validate req.body.userId is in project
    // TODO validate req.body.userId already rated card
    card.rates.push({
      userId: req.body.userId,
      point: req.body.point,
      createdDate: new Date()
    })
    card.save(function (err, saved) {
      if (err) return res.send(err);
      return res.send({message: "success to register comment"})
    })
  })
  .catch(function (err) {
    return console.error(err)
  })
})

function notFound(req, res) {
  res.statusCode = 400;
  res.send({message: `Can't find card: ${req.params.id}`})
}

module.exports = router;
