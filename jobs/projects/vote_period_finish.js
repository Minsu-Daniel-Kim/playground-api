const agenda = require('../agenda');
const common = require('../common');

let fsm = require('../tasks/cardstate');

const VotingPeriodMailer = require('../mails/vote_period_finished_mailer');
const Project = require('../../models/projects');
const Card = require('../../models/cards');
const CardState = require('../../models/card_state');
const StakingPool = require('../../models/stakings');


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

function transfer(card, amount, type, reason) {
  // TODO add/sub tokens to user
  // StakingPool.findOne({userId: card.assigneeId})
  //   .then(pool => pool.log(card.id, card.projectId, amount, type, reason).save())
  //   .catch(function (e) {
  //     console.error(e);
  //   });
}

function accept(card) {
  updateState(card, 'accepted');
  transfer(card, card.remainPoint, "ACCEPTED", "card is accepted");
}

function reject(card) {
  updateState(card, 'rejected');
  transfer(card, -1 * card.remainPoint, "REJECTED", "card is rejected");
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
