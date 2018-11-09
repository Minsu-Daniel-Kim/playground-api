const agenda = require('../agenda');
const mailer = require('../mails/mailer2');
const common = require('../common');
const Project = require('../../models/projects');
const User = require('../../models/users');
const PointPool = require('../../models/points');


function storeReputation(userId, projectId, point) {
  User.findOne({id: userId})
    .then(function (user) {
      user.reputation += point;
      let projectInfo = user.projects.find(e => e.projectId === projectId);
      projectInfo.gainedPoint = point;
      user.save();
    })
    .catch(function (e) {
      console.error(e);
    });
}

function settlePoints(studentIds, projectId) {
  PointPool.find({$in: {userId: studentIds}, projectId: projectId})
    .then(function (points) {
      if (points === null) {
        return console.warn(`token pool is empty: ${studentIds} in ${projectId}`);
      }
      points.map(token => storeReputation(token.userId, projectId, token.totalAmount));
    })
    .catch(function (e) {
      console.error(e);
    });
}

agenda.define('finishProject', (job, done) => {
  let projectId = job.attrs.data.projectId;
  console.log(`finishProject: ${projectId}`);

  Project.findOne({id: projectId})
    .then(function (project) {
      project.changeState("FINISHED").save();

      // point reputation 으로 정산한다
      let studentIds = project.students().map(e => e.userId);
      settlePoints(studentIds, projectId);

      // TODO staking 정산

      common.sendNotification(project, mailer.projectFinished);
    })
    .catch(function (err) {
      console.error(err)
    });
  done();
});
