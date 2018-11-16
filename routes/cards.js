let cardModule = require('../modules/cards');

let express = require('express');
let router = express.Router();

/* Router */
router.get('/', function (req, res, next) {
  return cardModule.listAll(req, res);
});

router.post('/:id/submission', function (req, res, next) {
  return cardModule.addSubmission(req, res);
});

router.get('/:id', function (req, res, next) {
  return cardModule.shorten(req, res);
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

router.post('/:id/comments/:commentId/disapprove', function (req, res, next) {
  return cardModule.cancelApprove(req, res);
});

/**
 * card의 데드라인이 얼마 남지 않은 경우 추가 staking을 한다.
 */
router.post('/:id/staking', function (req, res) {
  return cardModule.staking(req, res);
});

/**
 * Card를 archive 한다
 */
router.post('/:id/archive', function (req, res) {
  return cardModule.archive(req, res);
});

/**
 * Card를 un-archive 한다
 */
router.post('/:id/un-archive', function (req, res) {
  return cardModule.unArchive(req, res);
});

/** WARN: For development */
router.post('/:id/reset', function (req, res, next) {
  return cardModule.reset(req, res);
});

router.post('/reset', function (req, res, next) {
  return cardModule.resetAll(req, res);
});

module.exports = router;
