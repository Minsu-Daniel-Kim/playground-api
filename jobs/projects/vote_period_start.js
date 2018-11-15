const moment = require('moment');
const agenda = require('../agenda');
const fsm = require('../../tasks/cardstate');
const Project = require('../../models/projects');
const Card = require('../../models/cards');
const CardState = require('../../models/card_state');
const VotingPeriodMailer = require('../mails/vote_period_start_mailer');


function timeout(cards) {
  cards.map(card => {
    fsm.goto(card.currentState());
    fsm['timesup'](card);
    card.state = fsm.state;
    card.save();
  });
  // TODO bulk write
}

// IN_REVIEW가 아닌 상태는 모두 timesup 호출
function timeUp(project) {
  Card.find({projectId: project.id, state: CardState.IN_PROGRESS})
    .then(function (cards) {
      if (cards !== null)
        timeout(cards);
    })
    .catch(function (error) {
      console.error(error);
    });
}

agenda.define('startVotePeriod', (job, done) => {
  let projectId = job.attrs.data.projectId;
  console.log(`startVotePeriod:${projectId}`);

  Project.findOne({id: projectId})
    .then(function (project) {
      // TODO vote할 카드가 있는지 체크한다.
      // 1. voting 대상 외는 전부 times up으로 이동한다
      timeUp(project);
      // 3. send mail
      // common.sendNotification(project, VotingPeriodMailer.send);
    })
    .catch(function (err) {
      console.error(err)
    });

  // schedule end vote period
  agenda.schedule(moment().add(1, "day"), 'finishVotePeriod', {projectId: projectId});
  done();
});
