let Project = require('../models/projects');
let Card = require('../models/cards');
let CardState = require('../models/card_state');
let util = require('../modules/util');
let express = require('express');
let router = express.Router();

const runningStates = [CardState.NOT_STARTED, CardState.IN_PROGRESS, CardState.IN_REVIEW];

let getRunningCards = function (project) {
  return new Promise((resolve, reject) => {
    Card.find({projectId: project.id, state: runningStates})
      .then(function (cards) {
        return resolve({cards: cards, project: project});
      })
      .catch(function (e) {
        return reject(error);
      });
  });
};

router.get('/projects/:id', function (req, res) {
  let projectId = req.params.id;

  Project.findOne({id: projectId})
    .then(getRunningCards)
    .then(function (value) {
      let dto = {};
      dto.cardState = {
        totalCount: value.cards.length
      };
      let cards = util.groupBy(value.cards, 'state');
      runningStates.map(state => dto.cardState[state] = (cards[state] || []).length);

      cards[CardState.IN_REVIEW];
      let project = value.project;

      // 진행상황
      // current sprint phase
      // project.sprints
      return res.send(dto);
    })
    .catch(function (e) {
      console.error(e);
      res.send(500, {message: `Something went wrong: ${e.toString()}`})
    });
});

module.exports = router;