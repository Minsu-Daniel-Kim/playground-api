let cardModule = require('../modules/cards');

let express = require('express');
let router = express.Router();

/* Router */
router.get('/', function (req, res, next) {
  return cardModule.listAll(req, res);
});

router.post('/:id/submission', function (req, res, next) {
  return cardModule.attach(req, res);
});

router.get('/:id', function (req, res, next) {
  return cardModule.shorten(req, res);
});

router.get('/:id/detail', function (req, res, next) {
  return cardModule.detail(req, res);
});

router.post('/:id/update', function (req, res) {
  return cardModule.update(req, res);
});

router.post('/:id/ready', function (req, res, next) {
  return cardModule.ready(req, res);
});

router.post('/:id/assign', function (req, res, next) {
  return cardModule.assign(req, res);
});

router.post('/:id/giveup', function (req, res, next) {
  return cardModule.giveUp(req, res);
});

router.post('/:id/submit', function (req, res, next) {
  return cardModule.submit(req, res);
});

router.post('/:id/comment', function (req, res, next) {
  return cardModule.comment(req, res);
});

router.post('/:id/rate', function (req, res, next) {
  return cardModule.rate(req, res);
});

router.post('/:id/comments/:commentId/approve', function (req, res, next) {
  return cardModule.approveComment(req, res);
});

router.post('/:id/comments/:commentId/cancel-approve', function (req, res, next) {
  return cardModule.cancelApprove(req, res);
});


/** WARN: For development */
router.post('/:id/reset', function (req, res, next) {
  return cardModule.reset(req, res);
});

module.exports = router;
