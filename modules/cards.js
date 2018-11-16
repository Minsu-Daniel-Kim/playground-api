const moment = require('moment');
let Card = require('../models/cards');
let Submission = require('../models/submissions');
let Project = require('../models/projects');
let cardState = require('../models/card_state');
let TokenPool = require('../models/tokens');
let PointPool = require('../models/points');
let fsm = require('../tasks/cardstate');
let agenda = require('../jobs/agenda');
const mailer = require('../jobs/mails/mailer2');
require('../jobs/slashJob');
require('../jobs/notiExpireJob');


const COMMENT_APPROVE_POINT = 1;

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
  let cardId = req.params.id;
  Card.findOne({id: cardId})
    .then(card => exist(card, cardId))
    // .then(card => validateVote(card, userId)) // TODO
    .then(function (card) {
      return res.send(card.shorten());
    })
    .catch(function (err) {
      console.error(err);
      return res.send({message: err});
    })
};

cards.update = function (req, res) {
  let userId = req.body.userId;
  let cardId = req.params.id;
  let title = req.body.title;
  let desc = req.body.description;

  Card.findOne({id: cardId})
    .then(card => exist(card, cardId))
    .then(card => isMember(card, userId))
    // .then(card => validateVote(card, userId))
    .then(function (card) {
      if (isNotEmpty(title))
        card.title = title;
      if (isNotEmpty(desc))
        card.description = desc;

      // point 변경시 이미 assign된 경우는 처리가 어려우므로 일단 제외
      // if (isNotEmpty(point) card.point = point;
      card.save();
      return res.send(card.detail())
    })
    .catch(function (err) {
      console.error(err);
      return res.send(400, {message: err});
    });
};

function isNotEmpty(value) {
  return value !== undefined && value !== null && value !== '';
}

function isEmpty(str) {
  return str === undefined || str === null || str === '';
}

cards.addSubmission = function (req, res) {
  let cardId = req.params.id;
  let userId = req.body.userId;
  let submissionUrl = req.body.url;

  Card.findOne({id: cardId})
    .then(card => exist(card, cardId))
    .then(card => isAssignee(card, userId))
    // .then(card => validateVote(card, userId))
    .then(function (card) {
      if (isEmpty(submissionUrl))
        return res.send(400, {message: 'Url is empty'});

      Submission.new(card.id, submissionUrl).save(function (err) {
        if (err) return res.send(500, {message: e});
        return res.send({message: "Success"});
      });
    })
    .catch(function (err) {
      console.error(err);
      return res.send(400, {message: err});
    })
};

cards.ready = function (req, res) {
  return updateCardState(req, res, 'ready', isMentor);
};

function scheduleAfterAssignment(card, userId) {
  let job = agenda.create('slash', {cardId: card.id});
  // job.repeatEvery('1 hour', {skipImmediate: true}); // TODO
  job.repeatEvery('15 seconds', {skipImmediate: true}); // TODO
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

cards.submit = function (req, res) {
  return updateCardState(req, res, 'submitted', isAssignee)
};

function assignable(card, userId, action, stakingAmount) {
  return new Promise((resolve, reject) => {
    if (action !== 'assigned')
      resolve(card);

    TokenPool.findOne({userId: userId, projectId: card.projectId})
      .then(function (tokens) {
        if (tokens.totalAmount < stakingAmount)
          reject(`Not enough token total:${tokens.totalAmount} staking: ${stakingAmount}`);
        else resolve(card);
      })
      .catch(function (e) {
        console.error(e);
        reject(`Something went wrong: ${e.toString()}`);
      });
  });
}

function updateCardState(req, res, action, checkAuth, doAfterUpdate) {
  let cardId = req.params.id;
  let userId = req.body.userId;
  let stakingAmount = req.body.staking;

  Card.findOne({id: cardId})
    .then(card => exist(card, cardId))
    .then(card => checkAuth(card, userId))
    // .then(card => validateVote(card, userId))
    .then(card => assignable(card, userId, action, stakingAmount))
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
        if (doAfterUpdate !== undefined)
          doAfterUpdate(card);
        return res.send(saved.detail())
      })
    })
    .catch(function (error) {
      console.log(error);
      return res.send(400, {message: error});
    });
}

/**
 * Add comment
 */
cards.comment = function (req, res) {
  let cardId = req.params.id;
  let userId = req.body.userId;

  Card.findOne({id: cardId})
    .then(card => exist(card, cardId))
    .then(card => isMember(card, userId))
    // .then(card => validateVote(card, userId))
    .then(function (card) {
      card.addComment(req.body.title, req.body.content, req.body.userId, req.body.parentId);
      card.save(function (e) {
        if (e) return res.send(500, {message: e});
        return res.send({message: "success to register comment"})
      })
    })
    .catch(function (e) {
      console.log(e);
      return res.send(400, {message: e});
    });
};

const VOTING_STAKE_AMOUNT = 2;
const STAKE_TYPE = "VOTE";

function stakeForVote(projectId, userId) {
  Project.findOne({id: projectId})
    .then(function (project) {
      let now = new Date();
      let votePeriod = project.votingPeriods.find(period => period.startAt <= now && now < period.endAt);
      TokenPool.findOne({userId: userId, projectId: projectId})
        .then(function (tokens) {
          tokens.stake(votePeriod.id, VOTING_STAKE_AMOUNT, STAKE_TYPE).save()
        })
        .catch(function (e) {
          console.error(e);
        });
    });
}

/**
 * Rate card in voting period
 * require: MEMBER, TPM, TA
 * @param req
 * @param res
 */
cards.rate = function (req, res) {
  let cardId = req.params.id;
  let userId = req.body.userId;
  let point = req.body.point;

  Card.findOne({id: cardId})
    .then(card => exist(card, cardId))
    .then(card => isNotAssignee(card, userId))
    .then(card => isMember(card, userId))
    .then(function (card) {
      if (card.currentState() !== cardState.IN_REVIEW)
        return res.send(400, {message: `Can't rate card state: ${card.currentState()}`});
      // if (card.hasRated(userId))
      //   return res.send(400, {message: `already rated by ${userId}`});

      // stakeForVote(card.projectId, userId);
      card.rate(userId, point).save(function (e) {
        if (e) return res.send(500, {message: e});
        return res.send({message: "success to rate card"})
      })
    })
    .catch(function (e) {
      console.error(e);
      return res.send(400, {message: `Something went wrong: ${e.toString()}`})
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
    // .then(card => validateVote(card, userId))
    .then(function (card) {
      let comment = card.comments.find(comment => comment.id === commentId);
      if (comment.approved === true)
        return res.send(400, {message: 'Comment is already approved'});

      comment.approved = true;
      comment.approver = userId;
      card.save(function (e) {
        if (e) return res.send(500, {message: e});
        return res.send({message: "success to approve comment"})
      });

      // add point to user
      PointPool.findOne({userId: comment.userId, projectId: card.projectId})
        .then(function (points) {
          points.add(commentId, COMMENT_APPROVE_POINT, "COMMENT").save();
        })
        .catch(function (e) {
          console.error(e);
          return res.send(500, {message: e});
        });
    })
    .catch(function (err) {
      console.error(err);
      return res.send(400, {message: err});
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
    // .then(card => validateVote(card, userId))
    .then(function (card) {
      let comment = card.comments.find(comment => comment.id === commentId);
      if (comment.approved === false)
        return res.send(400, {message: 'Comment is not in approved state'});

      comment.approved = false;
      comment.approver = null;
      // sub point to user
      PointPool.findOne({userId: comment.userId, projectId: card.projectId})
        .then(function (points) {
          points.add(commentId, -COMMENT_APPROVE_POINT, "COMMENT").save();
        })
        .catch(function (e) {
          console.error(e);
        });

      card.save(function (err) {
        if (err) return res.send(err);
        return res.send({message: "success to cancel approval"})
      });
    })
    .catch(function (err) {
      console.error(err);
      return res.send(400, {message: err});
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
    // .then(card => validateVote(card, userId))
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
      return res.send(400, {message: e});
    })
};

cards.archive = function (req, res) {
  let cardId = req.params.id;
  let userId = req.body.userId;

  Card.findOne({id: cardId})
    .then(card => exist(card, cardId))
    // .then(card => isMentor(card, userId))
    // .then(card => validateVote(card, userId))
    .then(function (card) {
      card.deleted = true;
      card.save();
      res.send({message: "Success to archive cards"});
    })
    .catch(function (e) {
      console.error(e);
      return res.send(400, {message: e});
    });
};

cards.unArchive = function (req, res) {
  let cardId = req.params.id;
  let userId = req.body.userId;

  Card.findOne({id: cardId})
    .then(card => exist(card, cardId))
    // .then(card => isMentor(card, userId))
    // .then(card => validateVote(card, userId))
    .then(function (card) {
      card.deleted = false;
      card.save();
      res.send({message: "Success to un-archive cards"});
    })
    .catch(function (e) {
      console.error(e);
      return res.send(400, {message: e});
    });
};

function checkRole(card, userId, roles) {
  return new Promise((resolve, reject) => {
    Project.findOne({id: card.projectId})
      .then(function (project) {
        if (project === null || project === undefined)
          reject(`Project not exist: ${card.projectId}`);
        // TODO for temporary
        // if (project.isAdmin(userId))
          resolve(card);
        // if (project.hasAuth(userId, roles))
        //   resolve(card);
        // else reject(`${userId} has no auth of ${roles} in ${project.id}`);
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

function isMentor(card, userId) {
  return checkRole(card, userId, ["TPM", "TA"]);
}

function isMentee(card, userId) {
  return checkRole(card, userId, ["MEMBER"]);
}

function isMember(card, userId) {
  return checkRole(card, userId, ["TPM", "TA", "MEMBER"]);
}

function isAssignee(card, userId) {
  return new Promise((resolve, reject) => {
    if (card.assigneeId === userId)
      resolve(card);
    else reject(`Need role assignee: ${userId}`);
  })
}

function isNotAssignee(card, userId) {
  return new Promise((resolve, reject) => {
    if (card.assigneeId !== userId)
      resolve(card);
    else reject(`Assignee is not allowed: ${userId}`);
  })
}


function exist(card, cardId) {
  return new Promise((resolve, reject) => {
    if (card === null || card === undefined)
      reject(`Card not exist: ${cardId}`);
    else resolve(card);
  });
}

function validateVote(card, userId) {
  return new Promise((resolve, reject) => {
    Card.find({projectId: card.projectId, state: cardState.IN_REVIEW})
      .then(function (cards) {
        let inReviewCards = cards.filter(card => card.assigneeId !== userId);
        if (inReviewCards.length > 0 && inReviewCards.find(card => card.rates.find(rate => rate.userId === userId) === undefined))
          reject(`Have to vote first: ${card.id}`);
        else
          resolve(card);
      })
      .catch(function (e) {
        console.error(e);
        reject(`Something went wrong`);
      });
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

module.exports = cards;