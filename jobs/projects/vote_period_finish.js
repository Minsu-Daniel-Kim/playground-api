const agenda = require('../agenda');
const common = require('../common');

let fsm = require('../tasks/cardstate');

const VotingPeriodMailer = require('../mails/vote_period_finished_mailer');
const Project = require('../../models/projects');
const Card = require('../../models/cards');
const CardState = require('../../models/card_state');


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
  let action = 'accepted';
  updateState(card, action)
}

function reject(card) {
  let action = 'rejected';
  updateState(card, action)
}

const BOUNDARY_SCORE = 6;

function acceptOrReject(card) {
  card.gained >= BOUNDARY_SCORE ? accept(card) : reject(card);
}

agenda.define('finishVotePeriod', (job, done) => {
  let projectId = job.attrs.data.projectId;
  console.log(`finishVotePeriod:${projectId}`);

  Project.findOne({id: projectId})
    .then(function (project) {
      // 1. find in review cards
      Card.find({projectId: project.id, state: CardState.IN_PROGRESS})
        .then(function (cards) {
          if (cards === null) return;
          cards.map(card => {
            // 2. calculate each point of them
            card.gained = getAveragePoint(card.rates);
            // 3. change state to accept or reject
            acceptOrReject(card);

          });
        })
        .catch(function (error) {
          console.error(error);
        });
      // 5. add/sub staking to user
      // 6. send mail
      common.sendNotification(project, VotingPeriodMailer.send);
    })
    .catch(function (err) {
      console.error(err)
    });
  done();
});
