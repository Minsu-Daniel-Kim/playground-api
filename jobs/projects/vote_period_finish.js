const agenda = require('../agenda');
const common = require('../common');
const fsm = require('../../tasks/cardstate');
const Project = require('../../models/projects');
const Card = require('../../models/cards');
const TokenPool = require('../../models/tokens');
const PointPool = require('../../models/points');
const CardState = require('../../models/card_state');
const VotingPeriodMailer = require('../mails/vote_period_finished_mailer');


/** const value */
const BOUNDARY_SCORE = 6;
const RANGE = .5;
const PENALTY_AMOUNT = 1;
const ADVANTAGE_AMOUNT = 1;

function getAveragePoint(rates) {
  let sum = rates.map(rate => rate.point).reduce((total, num) => {
    return total + num;
  }, 0);
  return sum / rates.length;
}

function updateState(card, action) {
  fsm.goto(card.currentState());
  if (fsm.cannot(action)) {
    console.error(`Card cannot be ${action}. current state: ${card.currentState()}`);
  }
  if (fsm[action](card) === false) {
    console.error(`Card cannot be ${action}. current state: ${card.currentState()}`);
  }
  card.updateState(fsm.state).save();
}

function processToken(card, funcName, type) {
  TokenPool.findOne({userId: card.assigneeId, projectId: card.projectId})
    .then(tokens => tokens[funcName](card.id, type).save())
    .catch(function (e) {
      console.error(e);
    });
}

function processTokens(userIds, card, funcName, amount) {
  TokenPool.find({userId: {$in: userIds}, projectId: card.projectId})
    .then(function (tokens) {
      tokens.map(token => token[funcName](card.id, amount)).save();
    })
    .catch(function (e) {
      console.error(e);
    });
}

function giveVoteAdvantage(card) {
  let inRated = card.rates.filter(rate =>
    rate.point * (1 + RANGE) >= card.gained && rate.point * (1 - RANGE) <= card.gained)
    .map(rate => rate.userId);
  processTokens(inRated, card, 'advantage', ADVANTAGE_AMOUNT);
}

function giveVotePenalty(card) {
  let outRated = card.rates.filter(rate =>
    rate.point * (1 + RANGE) < card.gained || rate.point * (1 - RANGE) > card.gained)
    .map(rate => rate.userId);
  processTokens(outRated, card, 'penalty', PENALTY_AMOUNT);
}

function extracted(card) {
  PointPool.findOne({userId: card.assigneeId, projectId: card.projectId})
    .then(function (points) {
      /*TODO card의 rate point gained 도 고려해야함*/
      points.add(card.id, card.point, "CARD").save();
    })
    .catch(function (e) {
      console.error(e);
    });
}

function accept(card) {
  updateState(card, 'accepted');
  processToken(card, 'returnStake', "ACCEPTED");

  // accepted card 작업자에게 포인트를 준다
  extracted(card);
  // accepted card에 average의 50% 범위 내의 점수를 준 사람에게 어드밴티지를 준다
  giveVoteAdvantage(card);
  // accepted card에 average의 50% 범위 외의 점수를 투표한 사람에게 페널티를 준다
  giveVotePenalty(card);
}

function reject(card) {
  updateState(card, 'rejected');
  processToken(card, 'consumeStake', "REJECTED");

  // rejected card에 average의 50% 범위 내의 점수를 준 사람에게 어드밴티지를 준다
  giveVoteAdvantage(card);
  // rejected card에 average의 50% 범위 외의 점수를 투표한 사람에게 페널티를 준다
  giveVotePenalty(card);
}

function acceptOrReject(card) {
  card.gained = getAveragePoint(card.rates);
  card.gained >= BOUNDARY_SCORE ? accept(card) : reject(card);
}

agenda.define('finishVotePeriod', (job, done) => {
  let projectId = job.attrs.data.projectId;
  console.log(`finishVotePeriod: ${projectId}`);

  Project.findOne({id: projectId})
    .then(function (project) {
      Card.find({projectId: projectId, state: CardState.IN_REVIEW})
        .then(function (cards) {
          if (cards !== null)
            cards.map(card => acceptOrReject(card));
        })
        .catch(function (error) {
          console.error(error);
        });

      // TODO return vote staking
      // 한 번도 투표를 하지 않은 사람의 token consume

      common.sendNotification(project, VotingPeriodMailer.send);
    })
    .catch(function (err) {
      console.error(err)
    });
  done();
});
