const agenda = require('../agenda');
const mailer = require('../mails/mailer2');
const common = require('../common');
const Project = require('../../models/projects');


agenda.define('finishProject', (job, done) => {
  let projectId = job.attrs.data.projectId;
  console.log(`finishProject: ${projectId}`);

  Project.findOne({id: projectId})
    .then(function (project) {
      project.changeState("FINISHED").save();
      common.sendNotification(project, mailer.projectFinished);

      // TODO point 정산
      // TODO staking 정산
    })
    .catch(function (err) {
      console.error(err)
    });
  done();
});
