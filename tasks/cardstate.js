var StateMachine = require('javascript-state-machine');
var cardState = require('../models/constant');

console.log(`${cardState.BACKLOG} ${cardState.NOT_STARTED} ${cardState.IN_PROGRESS}`)

var fsm = new StateMachine({
  init: 'BACKLOG',
  transitions: [
    { name: 'ready',      from: cardState.BACKLOG,     to: cardState.NOT_STARTED },
    { name: 'assigned',   from: cardState.NOT_STARTED, to: cardState.IN_PROGRESS },
    { name: 'submitted',  from: cardState.IN_PROGRESS, to: cardState.IN_REVIEW },
    { name: 'accepted',   from: cardState.IN_REVIEW,   to: cardState.COMPLETE },
    { name: 'rejected',   from: cardState.IN_REVIEW,   to: cardState.IN_PROGRESS },
    { name: 'gaveup',     from: cardState.IN_PROGRESS, to: cardState.NOT_STARTED },
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