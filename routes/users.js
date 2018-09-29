let express = require('express');
let router = express.Router();
let userModule = require('../modules/users');

router.get('/', function(req, res, next) {
  return userModule.listAll(req, res);
});

router.get('/:id', function(req, res, next) {
  return userModule.getOne(req, res);
});

module.exports = router;