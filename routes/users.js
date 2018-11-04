let express = require('express');
let router = express.Router();
let userModule = require('../modules/users');

router.get('/', function(req, res, next) {
  return userModule.listAll(req, res);
});

router.get('/:id', function(req, res, next) {
  return userModule.getOne(req, res);
});

router.get('/:id/projects', function(req, res, next) {
  return userModule.enrolledProjects(req, res);
});

module.exports = router;