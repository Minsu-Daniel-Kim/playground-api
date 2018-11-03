let Card = require('../models/cards');
let Project = require('../models/projects');
let cardState = require('../models/card_state');
let fsm = require('../tasks/cardstate');
let agenda = require('../jobs/agenda');
require('../jobs/slashJob');
require('../jobs/notiExpireJob');

let cards = {};

cards.listAll = function (req, res) {
  Card.find({})
    .then(function (cards) {
      return res.send(cards);
    })
    .catch(function (err) {
      console.error(err);
      return res.send({message: err});
    })
};

cards.shorten = function (req, res) {
  Card.findOne({id: req.params.id})
    .then(card => exist(card, req.params.id))
    .then(function (card) {
      return res.send(card.shorten());
    })
    .catch(function (err) {
      console.error(err);
      return res.send({message: err});
    })
};

cards.detail = function (req, res) {
  Card.findOne({id: req.params.id})
    .then(card => exist(card, req.params.id))
    .then(function (card) {
      if (req.query.fields === 'all')
        return res.send(card.all());
      return res.send(card.detail())
    })
    .catch(function (err) {
      console.error(err);
      return res.send({message: err});
    });
};

cards.attach = function (req, res) {
  let cardId = req.params.id;
  let userId = req.body.userId;
  let submissionUrl = req.body.url;

  Card.findOne({id: cardId})
    .then(card => isAssignee(card, userId))
    .then(card => exist(card, cardId))
    .then(function (card) {
      if (isEmpty(req.body.url))
        return res.send(400, {message: 'Url is empty'});

      card.submissionUrl = submissionUrl;
      card.save(function (err, saved) {
        if (err) return res.send(err);
        return res.send(saved.detail())
      })
    })
    .catch(function (err) {
      console.error(err);
      return res.send({message: err});
    })
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

function updateCardState(req, res, action, checkAuth) {
  Card.findOne({id: req.params.id})
    .then(card => exist(card, req.params.id))
    .then(card => checkAuth(card, req.body.userId))
    .then(function (card) {
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
    })
    .catch(function (error) {
      console.log(error);
      return res.send({message: error});
    });
}

/**
 * FOR DEVELOPMENT
 * @param req
 * @param res
 * @param next
 */
cards.reset = function (req, res, next) {
  Card.findOne({id: req.params.id})
    .then(card => exist(card, req.params.id))
    .then(function (card) {
      card.clear();
      card.save(function (err, saved) {
        if (err) return res.send(err);
        return res.send(saved.detail())
      })
    })
    .catch(function (err) {
      console.error(err);
      return res.send({message: err});
    });
};

/**
 * Add comment
 */
cards.comment = function (req, res) {
  let cardId = req.params.id;
  Card.findOne({id: cardId})
    .then(card => exist(card, req.params.id))
    .then(card => isMember(card, req.body.userId))
    .then(function (card) {
      card.addComment(req.body.title, req.body.content, req.body.userId, req.body.parentId);
      card.save(function (err) {
        if (err) return res.send(err);
        return res.send({message: "success to register comment"})
      })
    })
    .catch(function (error) {
      console.log(error);
      return res.send({message: error});
    });
};

/**
 * Rate card in voting period
 * require: MEMBER, TPM, TA
 * @param req
 * @param res
 */
cards.rate = function (req, res) {
  let cardId = req.params.id;
  let userId = req.body.userId;
  Card.findOne({id: cardId})
    .then(card => isMember(card, userId))
    .then(function (card) {
      if (card.currentState() !== cardState.IN_REVIEW)
        return res.send({message: `Can't rate card state: ${card.currentState()}`});
      if (card.hasRated(userId))
        return res.send({message: `already rated by ${userId}`});

      card.rate(userId, req.body.point);
      card.save(function (err) {
        if (err) return res.send(err);
        return res.send({message: "success to register comment"})
      })
    })
    .catch(function (err) {
      console.error(err);
      return res.send({message: err})
    })
};

/**
 * Approve comment
 * require: TPM, TA
 * @param req
 * @param res
 */
cards.approveComment = function (req, res) {
  let cardId = req.params.id;
  let commentId = req.params.commentId;
  let userId = req.body.userId;

  Card.findOne({id: cardId})
    .then(card => isMentor(card, userId))
    .then(function (card) {
      let comment = card.comments.find(comment => comment.id === commentId);
      if (comment.approved === true)
        return res.send(400, {message: 'Comment is already approved'});

      comment.approved = true;
      comment.approver = userId;
      card.save(function (err) {
        if (err) return res.send(err);
        return res.send({message: "success to approve comment"})
      })

      // TODO add point to user
    })
    .catch(function (err) {
      console.error(err);
      return res.send({message: err});
    })
};

/**
 * Cancel approve
 * require: TPM, TA
 * @param req
 * @param res
 */
cards.cancelApprove = function (req, res) {
  let cardId = req.params.id;
  let commentId = req.params.commentId;
  let userId = req.body.userId;

  Card.findOne({id: cardId})
    .then(card => isMentor(card, userId))
    .then(function (card) {
      let comment = card.comments.find(comment => comment.id === commentId);
      if (comment.approved === false)
        return res.send(400, {message: 'Comment is not in approved state'});

      comment.approved = false;
      comment.approver = null;
      card.save(function (err) {
        if (err) return res.send(err);
        return res.send({message: "success to cancel approve comment"})
      })

      // TODO sub point from user
    })
    .catch(function (err) {
      console.error(err);
      return res.send({message: err});
    })
};

function isMentor(card, userId) {
  return checkRole(card, userId, ["TPM", "TA"]);
}

function isMentee(card, userId) {
  return checkRole(card, userId, ["MEMBER"]);
}

function isMember(card, userId) {
  return checkRole(card, userId, ["TPM", "TA", "MEMBER"]);
}

function checkRole(card, userId, roles) {
  return new Promise((resolve, reject) => {
    Project.findOne({id: card.projectId})
      .then(function (project) {
        if (project === null || project === undefined)
          reject(`Project not exist: ${card.projectId}`);
        if (project.hasAuth(userId, roles))
          resolve(card);
        else reject(`${userId} has no auth of ${roles} in ${project.id}`);
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

function isAssignee(card, userId) {
  return new Promise((resolve, reject) => {
    if (card.assigneeId === userId)
      resolve(card);
    else reject(`Need role assignee: ${userId}`);
  })
}

function exist(card, cardId) {
  return new Promise((resolve, reject) => {
    if (card === null || card === undefined)
      reject(`Card not exist: ${cardId}`);
    else resolve(card);
  });
}

module.exports = cards;