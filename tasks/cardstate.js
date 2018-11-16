var StateMachine = require('javascript-state-machine');
var CardState = require('../models/card_state');
var PointPool = require('../models/points');


// const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_HOUR = 1000 * 15; // TODO

let fsm = new StateMachine({
  init: CardState.BACKLOG,
  transitions: [
    {name: 'ready', from: CardState.BACKLOG, to: CardState.NOT_STARTED},
    {name: 'assigned', from: CardState.NOT_STARTED, to: CardState.IN_PROGRESS},
    {name: 'submitted', from: CardState.IN_PROGRESS, to: CardState.IN_REVIEW},
    {name: 'accepted', from: CardState.IN_REVIEW, to: CardState.COMPLETE},
    {name: 'rejected', from: CardState.IN_REVIEW, to: CardState.NOT_STARTED},
    {name: 'gaveup', from: CardState.IN_PROGRESS, to: CardState.NOT_STARTED},
    {name: 'timesup', from: CardState.IN_PROGRESS, to: CardState.BACKLOG},
    {
      name: 'goto', from: '*', to: function (state) {
        return state
      }
    }
  ],
  methods: {
    onReady: function (lifecycle, card, params) {
      console.log('onReady');
      if (params.point === undefined || params.point < 0)
        return false;
      card.point = params.point;
    },
    onAssigned: function (lifecycle, card, params) {
      console.log('onAssigned');
      if (params.userId === undefined || params.staking === undefined)
        return false;

      card.assigneeId = params.userId;
      card.staking = params.staking;
      card.slashCount = params.point;
      // card.ttl = card.point * MS_PER_HOUR;
      card.startedDate = new Date();
      card.dueDate = new Date(Date.now() + (card.point * MS_PER_HOUR));
      // TODO add history
      // card.history.push({})
    },
    onSubmitted: function (lifecycle, card, params) {
      console.log('onSubmitted');

      card.ttl = card.dueDate - Date.now()
      // TODO stop countdown
    },
    onAccepted: function (lifecycle, card, params) {
      console.log('onAccepted');
      // PointPool.findOne({projectId: card.projectId, userId: card.assigneeId})
      //   .then(pointPool => addPoint(pointPool, card))
      //   .catch(function (e) {
      //     console.error(e);
      //   });
    },
    onRejected: function (lifecycle, card, params) {
      console.log('onRejected');
      // TODO staking 차감
      card.clear();
    },
    onGaveup: function (lifecycle, card, params) {
      console.log('onGaveup');
      // TODO 남은 staking 반환
      card.clear()
    },
    onTimesup: function (lifecycle, card, params) {
      console.log('onTimesup');
      // TODO staking 차감
      card.clear()
    }
  }
});

const CARD_TYPE = "CARD";
const DEFAULT_MODIFIER = "SYSTEM";

// function addPoint(pointPool, card) {
//   return new Promise((resolve, reject) => {
//     if (pointPool === undefined || pointPool === null)
//       pointPool = PointPool.new(card.projectId, card.assigneeId);
//
//     pointPool.add(card.id, card.gained, CARD_TYPE, "Card accepted", DEFAULT_MODIFIER);
//     pointPool.save(function (err, saved) {
//       if (err) reject();
//       resolve(pointPool)
//     });
//   })
// }

module.exports = fsm;