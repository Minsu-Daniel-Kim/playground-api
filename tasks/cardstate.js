var StateMachine = require('javascript-state-machine');
var CARD_STATE = require('../models/constant');

var fsm = new StateMachine({
  init: 'BACKLOG',
  transitions: [
    { name: 'ready',      from: CARD_STATE.BACKLOG,     to: CARD_STATE.NOT_STARTED },
    { name: 'assigned',   from: CARD_STATE.NOT_STARTED, to: CARD_STATE.IN_PROGRESS },
    { name: 'submitted',  from: CARD_STATE.IN_PROGRESS, to: CARD_STATE.IN_REVIEW },
    { name: 'accepted',   from: CARD_STATE.IN_REVIEW,   to: CARD_STATE.COMPLETE },
    { name: 'rejected',   from: CARD_STATE.IN_REVIEW,   to: CARD_STATE.IN_PROGRESS },
    { name: 'gaveup',     from: CARD_STATE.IN_PROGRESS, to: CARD_STATE.NOT_STARTED },
    // TODO go to where?
    { name: 'timesup', from: 'IN_PROGRESS',  to: 'BACKLOG' },
    { name: 'goto', from: '*', to: function(state) { return state } }
  ],
  methods: {
    onReady: function(lifecycle, card, params) {
      if (params.point === undefined || params.point < 0)
        return false
      card.point = params.point
      card.timeLimit = card.point * _MS_PER_DAY
    },
    onAssigned: function(lifecycle, card, params) {
      if (params.userId === undefined || params.staking === undefined)
        return false;

      card.assigneeId   = params.userId;
      card.staking      = params.staking;
      card.ttl          = card.timeLimit;
      card.remainPoint  = card.point;
      card.startedAt    = new Date()
      card.dueDate      = new Date() + card.timeLimit * _MS_PER_HOUR;
      // TODO add history
      // card.history.add({})

      mailer.cardAssigned(card, params.userId)
      agenda.schedule(moment(card.dueDate).add(-1, 'hours').calendar(), 'notiExpiration', {cardId: card.id, userId: params.userId})
    },
    onSubmitted: function(lifecycle, card, params) {
      console.log('onSubmitted')
      // TODO stop countdown
      card.ttl = card.dueDate - Date.now()
    },
    onAccepted: function(lifecycle, card, params) {
      console.log('onAccepted')
      card.gained = params.point
      // TODO add point to assignee
    },
    onRejected: function(lifecycle, card, params) {
      console.log('onRejected')
      // TODO start countdown
    },
    onGaveup:   function(lifecycle, card, params) {
      console.log('onGaveup')
      card.clear()
    },
    onTimesup:  function(lifecycle, card, params) {
      console.log('onTimesup')
      card.clear()
    }
  }
});

module.exports = fsm;