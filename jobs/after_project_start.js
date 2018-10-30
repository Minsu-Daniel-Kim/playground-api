const agenda = require('./agenda');
const mailer = require('./mailer');
const Project = require('../models/projects');
const User = require('../models/users');


agenda.define('afterProjectStart', (job, done) => {
  let projectId = job.attrs.data.projectId;

  Project.findOne({id: projectId})
    .then(function (project) {
      let projectName = project.name;
      let userIds = project.members.map(e => e.userId);

      User.find({id: {$in: userIds}})
        .then(function (users) {
          updateEnrollState(users, projectId);

          users.map(user => mailer.memberSelected(projectName, user));
        }).catch(function (error) {
        console.error(error);
      });

    })
    .catch(function (err) {
      console.error(err)
    });
  done();
});

function updateEnrollState(users, projectId) {
  let bulkOps = users.map(user => bulkUpdateOp(user, projectId));
  User.bulkWrite(bulkOps)
    .then(bulkUpdateCallback)
    .catch(function (error) {
      console.error(error);
    });
}

function bulkUpdateOp(user, projectId) {
  return {
    "updateOne": {
      "filter": {"id": user.id},
      "update": {"$set": {"projects": user.enroll(projectId).projects}}
    }
  }
}

function bulkUpdateCallback(result) {
  console.log(result);
}