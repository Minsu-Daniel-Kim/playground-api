let Project = require('../models/projects');
let Card = require('../models/cards');
let CardState = require('../models/card_state');
let User = require('../models/users');
let StakingPool = require('../models/stakings');
let TokenPool = require('../models/tokens');
let Submission = require('../models/submissions');
let agenda = require('../jobs/agenda');
require('../jobs/projects/enrollment_close');
require('../jobs/projects/project_start');

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

router.post('/new', function (req, res) {
  let title = req.body.title;
  let desc = req.body.description;
  let userId = req.body.userId;

  let project = Project.new(title, desc, userId);
  project.startAt = req.body.startAt;
  project.endAt = req.body.endAt;
  project.sprintCount = req.body.sprintCount;
  project.votingPeriods = [
    // TODO
  ];

  project.save()
    .then(function (saved) {
      res.send(project);
    })
    .catch(function (e) {
      console.error(e);
      res.send(500, {message: 'Something went wrong'});
    });
});

router.post('/:id/requirement', function (req, res) {
  let projectId = req.params.id;
  Project.findOne({id: projectId})
  // TODO check project is in TEMP state
    .then(function (project) {
      // Course 최소, 최대 참여 인원수
      project.memberCount = {
        min: req.body.memberCount.min,
        max: req.body.memberCount.max
      };
      project.requirement = {
        stakingAmount: req.body.requirement.staking,
        reputation: req.body.requirement.reputation,
      };

      project.save().catch(function (e) {
        console.error(e);
        res.send(500, {message: 'Something went wrong'});
      });
      res.send(project);
    })
    .catch(function (e) {
      console.error(e);
      res.send(500, {message: 'Something went wrong'});
    });
});

router.post('/:id/funding', function (req, res) {
  let projectId = req.params.id;
  Project.findOne({id: projectId})
  // TODO check project is in TEMP state
    .then(function (project) {
      project.poolAllocation = {
        tmp: req.body.tmpStake,
        member: req.body.memberStake
      };
      project.openFunding = req.body.openFunding;

      project.save().catch(function (e) {
        console.error(e);
        res.send(500, {message: 'Something went wrong'});
      });
      res.send(project);
    })
    .catch(function (e) {
      console.error(e);
      res.send(500, {message: 'Something went wrong'});
    });
});

router.get('/:id', function (req, res, next) {
  Project.findOne({id: req.params.id}, function (err, project) {
    if (err) return console.error(err);
    if (project === null) return notFound(req, res);
    return res.send(project.to_json());
  });
});

let getSubmissions = function (cards) {
  let cardIds = cards.map(e => e.id);
  return new Promise((resolve, reject) => {
    Submission.find({cardId: {$in: cardIds}})
      .then(function (subs) {
        return resolve({cards: cards, subs: subs});
      })
      .catch(function (e) {
        return reject(error);
      });
  });
};

function citationDto(documents) {
  return documents.map(doc => {
    return {
      submissionId: doc.sourceId,
      cardId: doc.cardId,
      date: doc.createdAt
    }
  });
}

function setVoted(card, userId, dto) {
  if (card.state !== CardState.IN_REVIEW)
    return;
  // if (userId === "user2222") {
  //   dto.voted = true;
  //   return;
  // }

  let rate = card.rates.find(rate => rate.userId === userId);
  dto.voted = !(rate === undefined || rate === null);
}

router.get('/:id/cards', function (req, res, next) {
  let projectId = req.params.id;
  let userId = (req.header('userId') || 'user2222');
  console.log(`${req.header('userId')} ${userId}`);

  Card.find({projectId: projectId, deleted: {$in: [null, false]}})
    .then(cards => getSubmissions(cards))
    .then(function (values) {
      let cards = values.cards;
      let subs = values.subs;
      if (cards === null)
        return res.send({message: `Can't find cards by: ${projectId}`});
      return res.send(cards.map(card => {
        let dto = card.shorten();
        setVoted(card, userId, dto);
        dto.submissions = subs.filter(e => e.cardId === card.id).map(e => {
          return {
            id: e.id,
            url: e.url,
            citations: citationDto(e.citations),
            cited: citationDto(e.cited)
          }
        });
        return dto;
      }));
    })
    .catch(function (error) {
      console.error(error);
      res.status(500).send({message: "Something went wrong"});
    });
});

/**
 * Project에 카드를 생성한다
 * TPM, TA, MEMBER 모두 생성가능
 */
router.post('/:id/card', function (req, res, next) {
  let projectId = req.params.id;
  let userId = req.body.userId;
  if (userId === undefined || userId === null) {
    return res.send(401, {message: "no userId"});
  }

  Project.findOne({id: projectId, qualified: true})
    .then(function (project) {
      if (project === undefined || project === null) notFound(req, res);
      Card.new(projectId, userId, req.body.title, req.body.description)
        .save(function (err, saved) {
          if (err) return res.send(500, {message: err});
          return res.send({message: "success to register card"});
        });
    })
    .catch(function (error) {
      console.error(error);
      res.status(500).send({message: 'Something went wrong'})
    });
});

router.get('/:id/candidates', function (req, res) {
  Project.findOne({id: req.params.id})
    .then(function (project) {
      if (project === undefined || project === null) notFound(req, res);
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

  Project.findOne({id: projectId, qualified: true})
    .then(function (project) {
      if (project === null)
        return res.send(404, {message: `Cant find project: ${projectId}`});
      if (project.state !== "OPEN")
        return res.status(406).send({message: `Enrollment is not open!`});
      if (project.applied(userId) || project.enrolled(userId))
        return res.send(400, {message: `Already applied: ${userId}`});
      if (staking !== project.requirement.stakingAmount)
        return res.send(406, {message: `Invalid staking amount for project:${projectId}, need: ${project.requirement.stakingAmount} given:${staking}`});

      project.apply(userId, staking).save();

      // TODO project와 user 둘 다 저장이 성공해야함
      User.findOne({id: userId})
        .then(function (user) {
          if (user === null)
            return res.status(404).send({message: `Cant find user: ${userId}`});
          if (user.applied(projectId))
            return res.status(406).send({message: `Already enrolled: ${projectId}`});

          user.apply(projectId, staking).save();
          // staking
          StakingPool.findOne({userId: userId})
            .then(pool => {
              if (pool === null)
                pool = StakingPool.new(userId);
              pool.log(projectId, staking, "ENROLL", "").save()
            })
            .catch(function (e) {
              console.error(e);
              return res.status(500).send({message: 'Something went wrong'});
            });
          return res.send({message: `Success to apply`})
        })
        .catch(function (error) {
          // TODO rollback
          console.error(error);
        });
    })
    .catch(function (error) {
      console.error(error);
      return res.status(500).send({message: 'Something went wrong'});
    });
});

router.post('/:id/withdraw', function (req, res) {
  let projectId = req.params.id;
  let userId = req.body.userId;
  if (projectId === undefined || userId === undefined) {
    return res.status(406).send({message: `invalid argument: ${projectId}, ${userId}`})
  }

  Project.findOne({id: projectId, qualified: true}, function (err, project) {
    if (project === null)
      return res.send(404, {message: `Cant find project: ${projectId}`});
    if (project.state !== "OPEN")
      return res.status(406).send({message: `Enrollment is not open!`});
    if (project.applied(userId) !== true)
      return res.send(400, {message: `Not applied: ${userId}`});

    project.withdraw(userId).save();

    User.findOne({id: userId}, function (err, user) {
      if (user === null)
        return res.status(404).send({message: `Cant find user: ${userId}`});
      if (user.applied(projectId) !== true)
        return res.status(400).send({message: `Not applied: ${projectId}`});

      user.withdraw(projectId).save();

      // return staking
      StakingPool.findOne({userId: userId})
        .then(pool => {
          pool.log(projectId, /*TODO*/project.stakingAmount * -1, "WITHDRAW", "").save();
          return res.send({message: `Success to withdraw project`})
        })
        .catch(function (e) {
          console.error(e);
          return res.send(500, {message: `Something went wrong`});
        });
    });
  })
});

router.post('/:id/approve', function (req, res) {
  let projectId = req.params.id;
  let candidate = req.body.candidateId;
  let userId = req.body.userId;
  // TODO check auth

  Project.findOne({id: projectId, qualified: true})
    .then(function (project) {
      if (project === undefined || project === null)
        return notFound(req, res);
      if (candidate === undefined || candidate === null)
        return res.send(406, {message: 'candidate id is empty'});
      if (project.applied(candidate) !== true)
        return res.send(406, {message: `user id ${candidate} is not a candidate of project ${project.id}`});

      project.approve(candidate).save();
      return res.send({message: "Success to select member"});
    })
    .catch(function (error) {
      console.error(error);
    })
});

router.post('/:id/disapprove', function (req, res) {
  let projectId = req.params.id;
  let candidate = req.body.candidateId;
  let userId = req.body.userId;

  // TODO check auth
  Project.findOne({id: projectId, qualified: true})
    .then(function (project) {
      if (project === undefined || project === null) notFound(req, res);
      if (candidate === undefined || candidate === null)
        return res.send(406, {message: 'target id is empty'});
      if (project.enrolled(candidate) !== true)
        return res.send(406, {message: `user id ${candidate} is not a member of project ${project.id}`});

      project.disapprove(candidate).save();
      return res.send({message: `Success to withdraw member: ${candidate}`})
    })
    .catch(function (error) {
      console.error(error);
    })
});

router.post('/:id/close-enrollment', function (req, res) {
  let projectId = req.params.id;

  // TODO check auth
  Project.findOne({id: projectId, qualified: true})
    .then(function (project) {
      if (project === undefined || project === null)
        return notFound(req, res);
      if (project.state !== "OPEN")
        return res.status(406).send({message: `Cannot start project with state:${project.state}`});
      agenda.now('closeEnrollment', {projectId: projectId});

      return res.send({message: `Success`})
    })
    .catch(function (error) {
      console.error(error);
      return res.send(500, {message: `Something went wrong`});
    })
});

/**
 * Project를 open 상태로 변경한다
 */
router.post('/:id/publish', function (req, res) {
  let projectId = req.params.id;
  Project.findOne({id: projectId, qualified: true})
    .then(function (project) {
      if (project === undefined || project === null)
        return notFound(req, res);
      if (project.state !== "TEMP")
        return res.status(406).send({message: `Cannot publish project with state:${project.state}`});

      project.changeState("OPEN").save();

      /** trigger start project */
      agenda.schedule(project.startAt, 'startProject', {projectId: projectId});

      return res.send({message: `Success`})
    })
    .catch(function (error) {
      console.error(error);
      return res.send(500, {message: `Something went wrong`});
    })
});

function descOrderCompare(a, b) {
  if (a.value < b.value)
    return 1;
  if (a.value > b.value)
    return -1;
  return 0;
}

function setRank(users, valueList) {
  let ranks = [];
  Array.from(users).map(user => ranks.push({
    id: user.id,
    name: user.nickname,
    value: (valueList.get(user.id) || 0)
  }));
  ranks.sort(descOrderCompare);
  let rank = 1;
  ranks.map(e => e["rank"] = rank++);
  return ranks;
}

function rankByPoint(cards, users) {
  let points = new Map();
  cards.map(card => points.set(card.assigneeId, card.point + (points.get(card.assigneeId) || 0)));
  return setRank(users, points);
}

function rankByCardCount(cards, users) {
  let counts = new Map();
  cards.map(card => counts.set(card.assigneeId, 1 + (counts.get(card.assigneeId) || 0)));
  return setRank(users, counts);
}

function rankByToken(userIds, project) {
  TokenPool.find({userId: {$in: userIds}, projectId: project.id})
    .then(function (pools) {
      User.find({id: {$in: userIds}})
        .then(function (users) {
          let tokens = new Map();
          pools.map(token => tokens.set(token.userId, token.totalAmount + (tokens.get(token.userId) || 0)));
          let a = setRank(users, tokens);
          return a;
        })
        .catch(function (error) {
          console.error(error);
        })
    })
    .catch(function (error) {
      console.error(error);
    })
}

router.get('/:id/rank', function (req, res) {
  let projectId = req.params.id;
  let orderby = (req.query.orderby || 'point');

  Project.findOne({id: projectId, qualified: true})
    .then(function (project) {
      if (project === undefined || project === null)
        return notFound(req, res);

      let memberIds = project.students().map(e => e.userId);

      if (orderby === 'token') {
        TokenPool.find({userId: {$in: memberIds}, projectId: project.id})
          .then(function (pools) {
            User.find({id: {$in: memberIds}})
              .then(function (users) {
                let tokens = new Map();
                pools.map(token => tokens.set(token.userId, token.totalAmount + (tokens.get(token.userId) || 0)));
                return res.send(setRank(users, tokens));
              })
              .catch(function (error) {
                console.error(error);
                return res.send(500, {message: `Something went wrong`});
              });
          })
          .catch(function (error) {
            console.error(error);
            return res.send(500, {message: `Something went wrong`});
          });
      }

      Card.find({assigneeId: {$in: memberIds}, state: CardState.COMPLETE})
        .then(function (cards) {
          User.find({id: {$in: memberIds}})
            .then(function (users) {
              if (orderby === 'point')
                return res.send(rankByPoint(cards, users));
              else if (orderby === 'card')
                return res.send(rankByCardCount(cards, users));
            })
            .catch(function (error) {
              console.error(error);
              return res.send(500, {message: `Something went wrong`});
            })
        })
        .catch(function (error) {
          console.error(error);
          return res.send(500, {message: `Something went wrong`});
        });
    })
    .catch(function (error) {
      console.error(error);
      return res.send(500, {message: `Something went wrong`});
    });
});

module.exports = router;