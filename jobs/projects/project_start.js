const agenda = require('../agenda');
const mailer = require('../mails/mailer2');
const Project = require('../../models/projects');
const common = require('../common');
require('./project_finish');
require('./vote_period_start');


function canStart(project) {
  return project.students().length === project.requiredMemberCount;
}

function scheduleProjectFinish(project) {
  console.log('scheduleProjectFinish');
  agenda.schedule(project.endAt, 'finishProject', {projectId: project.id});
}

function scheduleVotingPeriod(project) {
  console.log('scheduleVotingPeriod');
  project.votingPeriods.map(period => {
    agenda.schedule(period.startAt, 'startVotePeriod', {projectId: project.id, votingPeriodId: period.id});
  })
}

agenda.define('startProject', (job, done) => {
  let projectId = job.attrs.data.projectId;
  console.log(`startProject: ${projectId}`);

  Project.findOne({id: projectId})
    .then(function (project) {
      if (canStart(project)) {
        /** 프로젝트 시작 */
        console.log('canStart');

        project.changeState("RUNNING").save();
        common.sendNotification(project, mailer.projectStarted);

        scheduleProjectFinish(project);
        scheduleVotingPeriod(project);
      } else {
        /** 멤버수가 다 모이지 않으면 FAILED */
        console.log('recruitFailed');
        project.changeState("FAILED").save();
        common.sendNotification(project, mailer.projectNotStarted);
      }
    })
    .catch(function (err) {
      console.error(err)
    });
  done();
});
