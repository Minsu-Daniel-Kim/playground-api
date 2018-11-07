const agenda = require('../agenda');
const common = require('../common');
const fsm = require('../tasks/cardstate');
const Project = require('../../models/projects');
const Card = require('../../models/cards');
const TokenPool = require('../../models/tokens');
const PointPool = require('../../models/points');
const CardState = require('../../models/card_state');
const VotingPeriodMailer = require('../mails/vote_period_finished_mailer');


/** const value */
const BOUNDARY_SCORE = 6;

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

function accept(card) {
  updateState(card, 'accepted');
  TokenPool.findOne({userId: card.assigneeId, projectId: card.projectId})
    .then(tokens => tokens.returnStake(card.id, "ACCEPTED").save())
    .catch(function (e) {
      console.error(e);
    });
  // accepted card 작업자에게 포인트를 준다
  PointPool.findOne({userId: card.assigneeId, projectId: card.projectId})
    .then(function (points) {
      points.add(card.id, /*TODO card의 point도 고려해야함*/card.gained, "CARD").save();
    })
    .catch(function (e) {
      console.error(e);
    });

  // TODO accepted card에 average보다 같거나 높은 점수를 투표한 사람에게 token을 준다
  // TODO accepted card에 average보다 낮은 점수를 투표한 사람에게 페널티를 준다 - token 가져감
}

function reject(card) {
  updateState(card, 'rejected');
  TokenPool.findOne({userId: card.assigneeId, projectId: card.projectId})
    .then(tokens => tokens.consumeStake(card.id).save())
    .catch(function (e) {
      console.error(e);
    });
  // TODO rejected card에 average보다 높은 점수를 투표한 사람에게 페널티를 준다 - token 가져감
  // card.rated.map(e => e.point > card.gained);
}

function acceptOrReject(card) {
  card.gained = getAveragePoint(card.rates);
  card.gained >= BOUNDARY_SCORE ? accept(card) : reject(card);
}

agenda.define('finishVotePeriod', (job, done) => {
  let projectId = job.attrs.data.projectId;
  console.log(`finishVotePeriod:${projectId}`);

  Project.findOne({id: projectId})
    .then(function (project) {
      // find in review cards
      Card.find({projectId: project.id, state: CardState.IN_PROGRESS})
        .then(function (cards) {
          if (cards === null) return;
          cards.map(card => {
            acceptOrReject(card);
          });
        })
        .catch(function (error) {
          console.error(error);
        });
      // send mail
      common.sendNotification(project, VotingPeriodMailer.send);
    })
    .catch(function (err) {
      console.error(err)
    });
  done();
});
