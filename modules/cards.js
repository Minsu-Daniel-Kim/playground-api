let Card = require('../models/cards');
let cardState = require('../models/constant');
let fsm = require('../tasks/cardstate');
let randomstring = require("randomstring");
let agenda = require('../jobs/agenda');
require('../jobs/slashJob');
require('../jobs/notiExpireJob');

let cards = {};

cards.listAll = function (req, res) {
  Card.find(function (err, cards) {
    if (err) return console.error(err);
    return res.send(cards);
  })
};

cards.shorten = function (req, res) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    if (card === null) return notFound(req, res);
    return res.send(card.shorten());
  })
};

cards.detail = function (req, res) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    if (card === null) return notFound(req, res);

    if (req.query.fields === 'all') {
      return res.send(card.all())
    }
    return res.send(card.detail())
  });
};

cards.attach = function (req, res) {
  let cardId = req.params.id;
  let userId = req.body.userId;
  let submissionUrl = req.body.url;

  Card.findOne({id: cardId}, function (err, card) {
    if (err) return console.error(err);
    if (isEmpty(req.body.url))
      return res.send(400, {message: 'Url is empty'});
    if (isAssignee(card, userId) !== true)
      return res.send(400, {message: 'No auth'});

    card.submissionUrl = submissionUrl;
    card.save(function (err, saved) {
      if (err) return res.send(err);
      return res.send(saved.detail())
    })
  });
};

function isEmpty(str) {
  return str === undefined || str === '' || str === null;
}

cards.ready = function (req, res) {
  return updateCardState(req, res, 'ready', isMentor);
};

cards.assign = function (req, res) {
  let cardId = req.params.id;

  // TODO do this after update card state
  agenda.now('sendMail', {cardId: cardId});
  let job = agenda.create('slash', {cardId: cardId});
  job.repeatEvery('1 hour', {skipImmediate: true});
  job.save();

  return updateCardState(req, res, 'assigned', isMentee)
};

cards.giveUp = function (req, res) {
  return updateCardState(req, res, 'gaveup', isAssignee)
};

cards.submit = function (req, res, next) {
  return updateCardState(req, res, 'submitted', isAssignee)
};

cards.accept = function (req, res, next) {
  return updateCardState(req, res, 'accepted', isMentor)
};

cards.reject = function (req, res, next) {
  return updateCardState(req, res, 'rejected', isMentor);
};

cards.reset = function (req, res, next) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    if (card === null) return notFound(req, res);
    card.clear();
    // card.state = cardState.BACK_LOG;
    card.save(function (err, saved) {
      if (err) return res.send(err);
      return res.send(saved.detail())
    })
  });
};

function isMentor(card, userId) {
  // TODO validate userId is TPM or TA
  return true;
}

function isMentee(card, userId) {
  // TODO validate userId is MEMBER
  return true;
}

function isMember(card, userId) {
  // TODO validate userId is member of project
  return true;
}

function isAssignee(card, userId) {
  return card.assigneeId === userId;
}

function updateCardState(req, res, action, validate) {
  Card.findOne({id: req.params.id}, function (err, card) {
    if (err) return console.error(err);
    if (card === null) return notFound(req, res);

    if (validate(card, req.body.userId) !== true)
      return res.send({message: 'No auth'});

    fsm.goto(card.currentState());
    if (fsm.cannot(action)) {
      return res.send({message: `Card cannot be ${action}. current state: ${card.currentState()}`})
    }
    if (fsm[action](card, req.body) === false) {
      return res.send({message: `Card cannot be ${action}. userId: ${req.body.userId}, staking: ${req.body.staking}`})
    }

    card.state = fsm.state;
    card.save(function (err, saved) {
      if (err) return res.send(err);
      return res.send(saved.detail())
    })
  });
}

cards.comment = function (req, res) {
  let cardId = req.params.id;
  Card.findOne({id: cardId}, function (err, card) {
    if (err) return console.error(err);
    if (card === null) return notFound(req, res);

    card.comments.push({
      id: "comment_" + randomstring.generate(8),
      parentId: req.body.parentId,
      title: req.body.title,
      content: req.body.content,
      userId: req.body.userId,
      createdDate: new Date()
    });

    card.save(function (err) {
      if (err) return res.send(err);
      return res.send({message: "success to register comment"})
    })
  });
};

cards.rate = function (req, res) {
  let cardId = req.params.id;
  let userId = req.body.userId;
  Card.findOne({id: cardId})
    .then(function (card) {
      if (card.currentState() !== cardState.IN_REVIEW)
        return res.send({message: `Can't rate card state: ${card.currentState()}`});
      if (isMember(card, userId) !== true)
        return res.send({message: 'Only member of this project can rate'});
      if (card.hasRated(userId))
        return res.send({message: `already rated by ${userId}`});

      card.rates.push({
        userId: userId,
        point: req.body.point,
        createdDate: new Date()
      });
      card.save(function (err) {
        if (err) return res.send(err);
        return res.send({message: "success to register comment"})
      })
    })
    .catch(function (err) {
      return console.error(err)
    })
};

function notFound(req, res) {
  res.statusCode = 400;
  res.send({message: `Can't find card: ${req.params.id}`})
}

module.exports = cards;