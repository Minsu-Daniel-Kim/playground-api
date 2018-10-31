var StateMachine = require('javascript-state-machine');
var CardState = require('../models/card_state');
var PointPool = require('../models/points');
var mailer = require('../jobs/mails/mailer2');
var agenda = require('../jobs/agenda');
var moment = require('moment');

const MS_PER_HOUR = 1000 * 60 * 60;

let fsm = new StateMachine({
  init: CardState.BACKLOG,
  transitions: [
    {name: 'ready', from: CardState.BACKLOG, to: CardState.NOT_STARTED},
    {name: 'assigned', from: CardState.NOT_STARTED, to: CardState.IN_PROGRESS},
    {name: 'submitted', from: CardState.IN_PROGRESS, to: CardState.IN_REVIEW},
    {name: 'accepted', from: CardState.IN_REVIEW, to: CardState.COMPLETE},
    {name: 'rejected', from: CardState.IN_REVIEW, to: CardState.IN_PROGRESS},
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
      card.timeLimit = card.point * _MS_PER_DAY
    },
    onAssigned: function (lifecycle, card, params) {
      console.log('onAssigned');
      if (params.userId === undefined || params.staking === undefined)
        return false;

      card.assigneeId = params.userId;
      card.staking = params.staking;
      card.ttl = card.timeLimit;
      card.remainPoint = card.point;
      card.startedAt = new Date();
      card.dueDate = new Date() + card.timeLimit * MS_PER_HOUR;
      // TODO add history
      // card.history.push({})

      mailer.cardAssigned(card, params.userId);
      agenda.schedule(moment(card.dueDate).add(-1, 'hours').calendar(), 'notiExpiration', {
        cardId: card.id,
        userId: params.userId
      })
    },
    onSubmitted: function (lifecycle, card, params) {
      console.log('onSubmitted');

      card.ttl = card.dueDate - Date.now()
      // TODO stop countdown
    },
    onAccepted: function (lifecycle, card, params) {
      console.log('onAccepted');
      // TODO card point는 vote 기반으로 계산되어야 함
      card.gained = card.point;

      PointPool.findOne({projectId: card.projectId, userId: card.assigneeId})
        .then(pointPool => addPoint(pointPool, card))
        .catch(function (e) {
          console.error(e);
        });
    },
    onRejected: function (lifecycle, card, params) {
      console.log('onRejected');
      // TODO start countdown again
    },
    onGaveup: function (lifecycle, card, params) {
      console.log('onGaveup');
      card.clear()
    },
    onTimesup: function (lifecycle, card, params) {
      console.log('onTimesup');
      card.clear()
    }
  }
});

function addPoint(pointPool, card) {
  return new Promise((resolve, reject) => {
    if (pointPool === undefined || pointPool === null)
      pointPool = PointPool.new(card.projectId, card.assigneeId);

    pointPool.gained(card.id, card.gained, "CARD", "Card accepted", "SYSTEM");
    pointPool.save(function (err, saved) {
      if (err) reject();
      resolve(pointPool)
    });
  })
}

module.exports = fsm;