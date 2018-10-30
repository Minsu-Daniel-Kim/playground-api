const agenda = require('../agenda');
const mailer = require('../mailer');
const common = require('../common');
const Project = require('../../models/projects');


agenda.define('finishProject', (job, done) => {
  let projectId = job.attrs.data.projectId;
  console.log(`finishProject: ${projectId}`);

  Project.findOne({id: projectId})
    .then(function (project) {
      project.state = "FINISHED";
      project.save();

      // TODO point 정산
      // TODO staking 정산

      common.sendNotification(project, mailer.projectFinished);
    })
    .catch(function (err) {
      console.error(err)
    });
  done();
});
