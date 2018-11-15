const User = require('../models/users');
const Project = require('../models/projects');
const Auth = require('../modules/authentications');

let express = require('express');
let router = express.Router();


function isAdmin(value, id) {
  return new Promise((resolve, reject) => {
    User.findOne({id: id})
      .then(function (admin) {
        if (admin === null || admin === undefined)
          reject(`User not exist: ${admin.id}`);
        if (admin.role === Auth.ADMIN)
          resolve(value);
        else reject(`${admin.id} is not admin`);
      })
      .catch(function (e) {
        console.error(e);
        reject(`Something went wrong: ${e.toString()}`);
      })
  });
}

router.post('/users/:id/qualify', function (req, res) {
  let userId = req.params.id;
  let adminId = req.body.userId;

  User.findOne({id: userId})
    .then(user => isAdmin(user, adminId))
    .then(function (user) {
      user.qualified = true;
      user.qualifier = adminId;
      user.save();
      res.send({message: `Success to approve user: ${userId}`});
    })
    .catch(function (e) {
      console.error(e);
      res.send(400, {message: 'Something went wrong'});
    });
});

router.post('/projects/:id/approve', function (req, res) {
  let projectId = req.params.id;
  let adminId = req.body.userId;

  Project.findOne({id: projectId})
    .then(project => isAdmin(project, adminId))
    .then(function (project) {
      project.qualified = true;
      project.qualifier = adminId;
      project.save();
      // TODO history
      res.send({message: `Success to approve project: ${projectId}`});
    })
    .catch(function (e) {
      console.error(e);
      res.send(400, {message: e});
    });
});

module.exports = router;