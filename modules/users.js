let User = require('../models/users');

let users = {};

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

module.exports = users;