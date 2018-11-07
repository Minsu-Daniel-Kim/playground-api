const moment = require('moment');
let Card = require('../models/cards');
let Project = require('../models/projects');
let cardState = require('../models/card_state');
let TokenPool = require('../models/tokens');
let fsm = require('../tasks/cardstate');
let agenda = require('../jobs/agenda');
const mailer = require('../jobs/mails/mailer2');
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

cards.update = function (req, res) {
  let userId = req.body.userId;
  let cardId = req.params.id;
  let title = req.body.title;
  let desc = req.body.description;

  Card.findOne({id: cardId})
    .then(card => exist(card, cardId))
    .then(card => isMember(card, userId))
    .then(function (card) {
      if (isNotEmpty(title))
        card.title = title;
      if (isNotEmpty(desc))
        card.description = desc;

      // TODO: point 변경시 이미 assign된 경우는 처리가 어려우므로 일단 제외
      // let point = req.body.label;
      // if (isNotEmpty(point))
      //   card.point = point;

      card.save();
      return res.send(card.detail())
    })
    .catch(function (err) {
      console.error(err);
      return res.send({message: err});
    });
};

function isNotEmpty(value) {
  return value !== undefined && value !== null && value !== '';
}

cards.attach = function (req, res) {
  let cardId = req.params.id;
  let userId = req.body.userId;
  let submissionUrl = req.body.url;

  Card.findOne({id: cardId})
    .then(card => exist(card, cardId))
    .then(card => isAssignee(card, userId))
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
  return str === undefined || str === null || str === '';
}

cards.ready = function (req, res) {
  return updateCardState(req, res, 'ready', isMentor);
};

function scheduleAfterAssignment(card, userId) {
  let job = agenda.create('slash', {cardId: card.id});
  job.repeatEvery('1 hour', {skipImmediate: true});
  job.save();

  // TODO card point가 1이면 noti expiration을 다르게 줘야함
  let expiredAt = moment(card.dueDate).add(-1, 'hours').calendar();
  agenda.schedule(expiredAt, 'notiExpiration', {cardId: card.id, userId: userId});

  mailer.cardAssigned(card, userId);
}

cards.assign = function (req, res) {
  let cardId = req.params.id;
  let userId = req.body.userId;
  let stakingAmount = req.body.staking;

  return updateCardState(req, res, 'assigned', isMentee, function (card) {
    TokenPool.findOne({userId: userId, projectId: card.projectId})
      .then(function (tokens) {
        tokens.stake(card.id, stakingAmount).save();
      })
      .catch(function (e) {
        console.error(e);
      });
    scheduleAfterAssignment(card, userId, cardId);
  });
};

cards.giveUp = function (req, res) {
  let userId = req.body.userId;

  return updateCardState(req, res, 'gaveup', isAssignee, function (card) {
    TokenPool.findOne({userId: userId, projectId: card.projectId})
      .then(function (tokens) {
        tokens.returnStake(card.id, "GIVE_UP").save();
      })
      .catch(function (e) {
        console.error(e);
      });
  });
};

cards.submit = function (req, res, next) {
  return updateCardState(req, res, 'submitted', isAssignee)
};

function updateCardState(req, res, action, checkAuth, afterUpdate) {
  Card.findOne({id: req.params.id})
    .then(card => exist(card, req.params.id))
    .then(card => checkAuth(card, req.body.userId))
    .then(function (card) {
      fsm.goto(card.currentState());
      if (fsm.cannot(action)) {
        return res.send({message: `Card cannot be ${action}. current state: ${card.currentState()}`})
      }
      if (fsm[action](card, req.body) === false) {
        return res.send({message: `Card cannot be ${action}. userId: ${req.body.userId}, point: ${req.body.point}`})
      }

      card.state = fsm.state;
      card.save(function (err, saved) {
        if (err) return res.send(500, {message: err});
        if (afterUpdate !== undefined)
          afterUpdate(card);
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

cards.resetAll = function (req, res, next) {
  Card.find({state: {$in: [cardState.IN_PROGRESS, cardState.IN_REVIEW, cardState.IN_COMPLETE]}})
    .then(function (cards) {
      cards.map(card => {
        card.clear();
        card.save()
      });
      return res.send({message: `reset ${cards.length} cards`})
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
    .then(card => exist(card, cardId))
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
    .then(card => exist(card, cardId))
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
    .then(card => exist(card, cardId))
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
    });
};

cards.staking = function (req, res) {
  let cardId = req.params.id;
  let userId = req.body.userId;
  let stakingAmount = req.body.staking;

  if (stakingAmount === undefined || stakingAmount < 0)
    return res.send(406, {message: `Invalid staking amount ${stakingAmount}`});

  Card.findOne({id: cardId})
    .then(card => exist(card, cardId))
    .then(card => isAssignee(card, userId))
    .then(function (card) {
      TokenPool.findOne({userId: userId, projectId: card.projectId})
        .then(function (tokens) {
          tokens.stake(card.id, stakingAmount).save();
          return res.send({message: `Success to stake: ${cardId}, ${stakingAmount}`});
        })
        .catch(function (e) {
          console.error(e);
          return res.send(500, {message: e});
        });
    })
    .catch(function (e) {
      console.error(e);
      return res.send(500, {message: e});
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