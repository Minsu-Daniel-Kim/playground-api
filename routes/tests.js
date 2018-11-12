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

module.exports = router;