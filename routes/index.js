var express = require('express');
var router = express.Router();
require('../common/connection');

router.get('/', function(req, res, next) {
  res.render('index', { title: 'hello world' });
});

module.exports = router;
