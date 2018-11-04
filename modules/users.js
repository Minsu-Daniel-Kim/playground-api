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
  User.findOne({id: req.params.id}, function (err, user) {
    if (err) return console.error(err);
    if (user === null) return res.send({message: "Can't find user"});
    return res.send(user.to_json());
  })
};

users.enrolledProjects = function (req, res) {
  User.findOne({id: req.params.id})
    .then(function (user) {
      if (user === null) return notFount(res);
      return res.send(user.projects);
    })
    .catch(function (error) {
      console.error(error);
      return res.send(500, {message: 'Something went wrong'});
    });
};

module.exports = users;