let User = require('../models/users');

let users = {};

function notFount(res) {
  return res.send(404, {message: "Can't find user"});
}

users.listAll = function (req, res) {
  User.find(function (err, users) {
    if (err) return console.error(err);
    return res.send(users);
  })
};

users.getOne = function (req, res) {
  User.findOne({id: req.params.id})
    .then(function (user) {
      if (user === undefined || user === null) return notFount(res);
      return res.send(user.to_json());
    })
    .catch(function (e) {
      console.error(e);
      return res.send(500, {message: 'Something went wrong'});
    })
};

users.enrolledProjects = function (req, res) {
  User.findOne({id: req.params.id})
    .then(function (user) {
      if (user === undefined || user === null) return notFount(res);
      return res.send(user.projects.map(e => {
        return {
          projectId: e.projectId,
          joinedAt: e.joinedAt,
          startDate: e.startedDate,
          endDate: e.endedDate,
          staking: e.staking,
          gainedPoint: e.gainedPoint,
          state: e.state
        }
      }));
    })
    .catch(function (error) {
      console.error(error);
      return res.send(500, {message: 'Something went wrong'});
    });
};

module.exports = users;