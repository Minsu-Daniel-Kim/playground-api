const agenda = require('../agenda');
const mailer = require('../mailer');
const Project = require('../../models/projects');
const common = require('../common');
require('./finish_project');


function canStart(project) {
  return project.students().length === project.requiredMemberCount;
}

agenda.define('startProject', (job, done) => {
  let projectId = job.attrs.data.projectId;
  console.log(`startProject: ${projectId}`);

  Project.findOne({id: projectId})
    .then(function (project) {
      if (canStart(project)) {
        /** 프로젝트 시작 */
        console.log('canStart');

        project.state = "RUNNING";
        project.save();
        common.sendNotification(project, mailer.projectStarted);

        // schedule project end
        agenda.schedule(project.endAt, 'finishProject', {projectId: projectId});
        // TODO schedule voting periods
      } else {
        /** 멤버수가 다 모이지 않으면 FAILED */
        console.log('recruitFailed');
        project.state = "FAILED";
        project.save();
        common.sendNotification(project, mailer.projectNotStarted);
      }
    })
    .catch(function (err) {
      console.error(err)
    });
  done();
});
