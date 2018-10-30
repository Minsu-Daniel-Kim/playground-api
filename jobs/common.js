const User = require('../models/users');

module.exports.sendNotification = function (project, mailerMethod) {
  let userIds = project.members.map(e => e.userId);
  User.find({id: {$in: userIds}})
    .then(function (users) {
      users.map(user => mailerMethod(project.name, user));
    }).catch(function (error) {
    console.error(error);
  });
};

module.exports.sendNotificationWithCallback = function (project, userIds, promise) {
  User.find({id: {$in: userIds}})
    .then(promise)
    .catch(function (error) {
    console.error(error);
  });
};
