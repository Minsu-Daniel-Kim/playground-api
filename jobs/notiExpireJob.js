var Card = require('../models/cards');
var cardState = require('../models/constant');
var agenda = require('./agenda');
var mailer = require('./mailer');

agenda.define('notiExpiration', (job, done) => {
  let cardId = job.attrs.data.cardId;
  let userId = job.attrs.data.userId;

  Card.findOne({id: cardId}, function (err, card) {
    if (err) return console.error(err);
    if (card.currentState() === cardState.IN_PROGRESS && card.ttl > 0) {
      mailer.notiExpiration(card, userId)
    }
    done();
  });
});
