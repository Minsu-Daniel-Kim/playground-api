let StakingPool = require("../models/stakings");
let TokenPool = require("../models/tokens");
let PointPool = require("../models/points");
let Submission = require("../models/submissions");
let agenda = require('../jobs/agenda');
require('../jobs/projects/enrollment_close');
require('../jobs/projects/project_start');
require('../jobs/projects/project_finish');
require('../jobs/projects/vote_period_start');
require('../jobs/projects/vote_period_finish');

let express = require('express');
let router = express.Router();

router.get('/projects/:id/start', function (req, res) {
  let projectId = req.params.id;

  agenda.now('startProject', {projectId: projectId});
  return res.send({message: `Started project: ${projectId}`});
});

router.get('/projects/:id/finish', function (req, res) {
  let projectId = req.params.id;

  agenda.now('finishProject', {projectId: projectId});
  return res.send({message: `Started project: ${projectId}`});
});

router.get('/projects/:id/vote/:votingPeriodId/start', function (req, res) {
  let projectId = req.params.id;
  let votingPeriodId = req.params.votingPeriodId;

  agenda.now('startVotePeriod', {projectId: projectId, votingPeriodId: votingPeriodId});
  return res.send({message: `Started voting period: ${projectId}, ${votingPeriodId}`});
});

router.get('/projects/:id/vote/:votingPeriodId/finish', function (req, res) {
  let projectId = req.params.id;
  let votingPeriodId = req.params.votingPeriodId;

  agenda.now('finishVotePeriod', {projectId: projectId, votingPeriodId: votingPeriodId});
  return res.send({message: `Finished voting period: ${projectId}, ${votingPeriodId}`});
});

router.get('/stakings', function (req, res) {
  StakingPool.find({})
    .then(function (stakings) {
      return res.send(stakings);
    })
    .catch(function (e) {
      console.error(e);
      return res.send(500, {message: "Something went wrong"});
    });
});

router.get('/tokens', function (req, res) {
  TokenPool.find({})
    .then(function (tokens) {
      return res.send(tokens);
    })
    .catch(function (e) {
      console.error(e);
      return res.send(500, {message: "Something went wrong"});
    });
});

router.get('/points', function (req, res) {
  PointPool.find({})
    .then(function (points) {
      return res.send(points);
    })
    .catch(function (e) {
      console.error(e);
      return res.send(500, {message: "Something went wrong"});
    });
});

router.get('/submissions', function (req, res) {
  Submission.find({})
    .then(function (submissions) {
      return res.send(submissions);
    })
    .catch(function (e) {
      console.error(e);
      return res.send(500, {message: "Something went wrong"});
    });
});

module.exports = router;