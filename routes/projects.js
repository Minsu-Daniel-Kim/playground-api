let randomstring = require("randomstring");
let Project = require('../models/projects');
let Card = require('../models/cards');
let User = require('../models/users');
let agenda = require('../jobs/agenda');
require('../jobs/after_project_start');

let express = require('express');
let router = express.Router();


function notFound(req, res) {
  res.status(400).send({message: `Can't find project: ${req.params.id}`})
}

// api for managing
router.get('/', function (req, res, next) {
  Project.find(function (err, projects) {
    if (err) return console.error(err);
    return res.send(projects);
  })
});

router.get('/:id', function (req, res, next) {
  Project.findOne({id: req.params.id}, function (err, project) {
    if (err) return console.error(err);
    if (project === null) return notFound(req, res);
    return res.send(project.to_json());
  });
});

router.get('/:id/cards', function (req, res, next) {
  Card.find({projectId: req.params.id}, function (err, cards) {
    if (err) return console.error(err);
    if (cards !== null)
      return res.send(cards.map(card => card.shorten()));
    return res.send({message: `Can't find cards by: ${req.params.id}`});
  });
});

// project에 카드를 생성한다
router.post('/:id/card', function (req, res, next) {
  if (req.body.userId === undefined || req.body.userId === null) {
    return res.send(400, {message: "no userId"});
  }

  Project.findOne({id: req.params.id}, function (err, project) {
    if (err) return console.error(err);
    if (project === null) return notFound(req, res);

    Card.new({
      id: "card" + randomstring.generate(8),
      projectId: req.params.id,
      title: getOrDefault(req.body.title, ''),
      description: getOrDefault(req.body.description, ''),
      createdDate: new Date(),
      createdBy: req.body.userId,
      state: CardState.BACKLOG,
      history: [],
      comments: []
    }).save(function (err, saved) {
      if (err) return res.send(err);
      return res.send({message: "success to register card"});
    });
  });
});

router.get('/:id/candidates', function (req, res) {
  Project.findOne({id: req.params.id})
    .then(function (project) {
      if (project === undefined || project === null)
        notFound(req, res);
      return res.send({candidates: toCandidate(project.candidates)})
    })
    .catch(function (error) {
      console.error(error);
    })
});

function toCandidate(candidates) {
  return candidates.map(candidate => {
    return {
      id: candidate.userId,
      joinedAt: candidate.joinedDate
    }
  });
}

/**
 * 프로젝트의 candidate로 등록한다
 */
router.post('/:id/apply', function (req, res, next) {
  let projectId = req.params.id;
  let userId = req.body.userId;
  let staking = req.body.staking;
  if (projectId === undefined || userId === undefined || staking === undefined) {
    return res.send({message: `invalid argument: ${projectId}, ${userId}, ${staking}`})
  }

  Project.findOne({id: projectId}, function (err, project) {
    if (project === null)
      return res.send(404, {message: `Cant find project: ${projectId}`});

    // TODO check enrollment is open
    // TODO check staking has same with project's staking amount

    if (project.applied(userId) || project.enrolled(userId))
      return res.send(400, {message: `Already applied: ${userId}`});

    project.apply(userId, staking).save();

    // TODO project와 user 둘 다 저장이 성공해야함
    User.findOne({id: userId}, function (err, user) {
      if (user === null)
        return res.status(404,).send({message: `Cant find user: ${userId}`});
      if (user.applied(projectId))
        return res.send(400, {message: `Already enrolled: ${projectId}`});

      user.apply(projectId, staking).save();
      return res.send({message: `Success to apply`})
    });
  });
});

router.post('/:id/disjoin', function (req, res) {
  let projectId = req.params.id;
  let userId = req.body.userId;
  if (projectId === undefined || userId === undefined) {
    return res.status(406).send({message: `invalid argument: ${projectId}, ${userId}`})
  }

  Project.findOne({id: projectId}, function (err, project) {
    if (project === null)
      return res.send(404, {message: `Cant find project: ${projectId}`});
    if (project.state !== "OPEN")
      return res.status(406).send({message: `Enrollment is not open!`});
    if (project.applied(userId) !== true)
      return res.send(400, {message: `Not applied: ${userId}`});

    project.disjoin(userId).save();

    User.findOne({id: userId}, function (err, user) {
      if (user === null)
        return res.status(404).send({message: `Cant find user: ${userId}`});
      if (user.applied(projectId) !== true)
        return res.status(400).send({message: `Not applied: ${projectId}`});

      user.disjoin(projectId).save();
      return res.send({message: `Success to disjoin project`})
    });
  })
});

router.post('/:id/enroll', function (req, res) {
  let projectId = req.params.id;
  let candidate = req.body.targetId;
  let userId = req.body.userId;
  // TODO check auth
  Project.findOne({id: projectId})
    .then(function (project) {
      if (project === undefined || project === null)
        notFound(req, res);
      if (candidate === undefined || candidate === null)
        return res.send(406, {message: 'candidate id is empty'});
      if (project.applied(candidate) !== true)
        return res.send(406, {message: `user id ${candidate} is not a candidate of project ${project.id}`});

      project.enroll(candidate).save();
      return res.send({message: "Success to select member"});
    })
    .catch(function (error) {
      console.error(error);
    })
});

router.post('/:id/withdraw', function (req, res) {
  let projectId = req.params.id;
  let targetId = req.body.targetId;
  // TODO check auth
  Project.findOne({id: projectId})
    .then(function (project) {
      if (project === undefined || project === null) notFound(req, res);
      if (targetId === undefined || targetId === null)
        return res.send(406, {message: 'target id is empty'});
      if (project.enrolled(targetId) !== true)
        return res.send(406, {message: `user id ${targetId} is not a member of project ${project.id}`});

      project.withdraw(targetId).save();
      return res.send({message: `Success to withdraw member: ${targetId}`})
    })
    .catch(function (error) {
      console.error(error);
    })
});

router.post('/:id/close-enrollment', function (req, res) {
  let projectId = req.params.id;

  // TODO check auth
  Project.findOne({id: projectId})
    .then(function (project) {
      if (project === undefined || project === null) notFound(req, res);
      if (project.state !== "OPEN")
        return res.state(406).send({message: `Cannot start project with state:${project.state}`});

      project.state = "RUNNING";
      project.save();

      agenda.now('afterProjectStart', {projectId: projectId});
      return res.send({message: `Success`})
    })
    .catch(function (error) {
      console.error(error);
    })
});

// TODO for development
router.post('/:id/open-enrollment', function (req, res) {
  let projectId = req.params.id;
  Project.findOne({id: projectId})
    .then(function (project) {
      if (project === undefined || project === null)
        notFound(req, res);
      project.state = "OPEN";
      project.save();
      return res.send({message: `Success`})
    })
    .catch(function (error) {
      console.error(error);
    })
});

function getOrDefault(value, defaultValue) {
  return value !== undefined ? value : defaultValue;
}

module.exports = router;