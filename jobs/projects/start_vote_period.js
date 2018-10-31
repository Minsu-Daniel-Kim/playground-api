const agenda = require('../agenda');
const VotingPeriodMailer = require('../mails/vote_period_start_mailer');
const Project = require('../../models/projects');
const common = require('../common');


agenda.define('startVotePeriod', (job, done) => {
  let projectId = job.attrs.data.projectId;
  console.log(`startVotePeriod: ${projectId}`);

  Project.findOne({id: projectId})
    .then(function (project) {
      // TODO vote period start

      // 1. send mail
      common.sendNotification(project, VotingPeriodMailer.send);
      // 2. hold stake for vote
      // 3. voting 대상 외는 전부 times up으로 이동한다
    })
    .catch(function (err) {
      console.error(err)
    });
  done();
});
