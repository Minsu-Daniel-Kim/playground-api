var Card = require('../models/cards');
var cardState = require('../models/card_state');
var agenda = require('./agenda');
var mailer = require('./mails/mailer2');

agenda.define('notiExpiration', (job, done) => {
  let cardId = job.attrs.data.cardId;
  let userId = job.attrs.data.userId;
  console.log(`notiExpiration: cardId: ${cardId}, userId: ${userId}`);

  Card.findOne({id: cardId})
    .then(function (card) {
      if (card === null) return;
      if (card.currentState() === cardState.IN_PROGRESS && card.ttl > 0) {
        mailer.notiExpiration(card, userId)
      }
      done();
    })
    .catch(function (e) {
      console.error(e);
    });
});
