var StateMachine = require('javascript-state-machine');
var cardState = require('../models/constant');
var PointPool = require('../models/points');
var mailer = require('../jobs/mailer');
var agenda = require('../jobs/agenda');
var moment = require('moment');

const MS_PER_HOUR = 1000 * 60 * 60;

var fsm = new StateMachine({
  init: 'BACKLOG',
  transitions: [
    { name: 'ready',      from: cardState.BACKLOG,     to: cardState.NOT_STARTED },
    { name: 'assigned',   from: cardState.NOT_STARTED, to: cardState.IN_PROGRESS },
    { name: 'submitted',  from: cardState.IN_PROGRESS, to: cardState.IN_REVIEW },
    { name: 'accepted',   from: cardState.IN_REVIEW,   to: cardState.COMPLETE },
    { name: 'rejected',   from: cardState.IN_REVIEW,   to: cardState.IN_PROGRESS },
    { name: 'gaveup',     from: cardState.IN_PROGRESS, to: cardState.NOT_STARTED },
    { name: 'timesup',    from: 'IN_PROGRESS',  to: 'BACKLOG' },
    { name: 'goto',       from: '*', to: function(state) { return state } }
  ],
  methods: {
    onReady: function (lifecycle, card, params) {
      if (params.point === undefined || params.point < 0)
        return false;
      card.point = params.point;
      card.timeLimit = card.point * _MS_PER_DAY
    },
    onAssigned: function (lifecycle, card, params) {
      if (params.userId === undefined || params.staking === undefined)
        return false;

      card.assigneeId   = params.userId;
      card.staking      = params.staking;
      card.ttl          = card.timeLimit;
      card.remainPoint  = card.point;
      card.startedAt    = new Date();
      card.dueDate      = new Date() + card.timeLimit * MS_PER_HOUR;
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