const agenda = require('../agenda');
const mailer = require('../mails/mailer2');
const common = require('../common');

const Project = require('../../models/projects');
const User = require('../../models/users');
const StakingPool = require('../../models/stakings');


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

function updateEnrollState(users, projectId) {
  let bulkOps = users.map(user => bulkUpdateOp(user, projectId));
  User.bulkWrite(bulkOps)
    .then(bulkUpdateCallback)
    .catch(function (error) {
      console.error(error);
    });
}

function returnStaking(userId, projectId, project) {
  StakingPool.findOne({userId: userId})
    .then(pool => {
      if (pool === undefined || pool === null) {
        console.error(`Staking pool is not exist of ${userId} in ${projectId}`);
        return;
      }
      pool.log(projectId, projectId, project.staking * -1, "WITHDRAW", "").save()
    })
    .catch(function (e) {
      console.error(e);
    });
}

agenda.define('closeEnrollment', (job, done) => {
  let projectId = job.attrs.data.projectId;

  Project.findOne({id: projectId})
    .then(function (project) {
      let projectName = project.name;

      // Send celebrate message to members
      let userIds = project.students().map(e => e.userId);
      common.sendNotificationWithCallback(project, userIds, function (users) {
        updateEnrollState(users, projectId);
        users.map(user => mailer.memberSelected(projectName, user));
      });

      // Send sorry message to candidates
      userIds = project.candidates.map(e => e.userId);
      common.sendNotificationWithCallback(project, userIds, function (users) {
        users.map(user => mailer.memberNotSelected(projectName, user));
      });

      // return staking to candidates
      userIds.map(userId => returnStaking(userId, projectId, project));
    })
    .catch(function (err) {
      console.error(err)
    });
  done();
});