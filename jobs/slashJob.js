var Card = require('../models/cards');
var cardState = require('../models/constant');
var agenda = require('./agenda');
var fsm = require('../tasks/cardstate');

const MS_PER_HOUR = 1000 * 60 * 60;

agenda.define('slash', (job, done) => {
  let cardId = job.attrs.data.cardId;
  console.log(`slash ${cardId} ${new Date().toLocaleString()}`);

  Card.findOne({id: cardId})
    .then(function (card) {
      if (card.currentState() !== cardState.IN_PROGRESS || card.ttl < 0) {
        job.remove();
        done();
        return;
      }

      card.ttl -= MS_PER_HOUR;
      if (card.ttl > 0) {
        card.remainPoint -= 1
        // TODO staking transfer
      } else {
        fsm.goto(card.currentState());
        fsm.timesup(card);
        job.remove()
        // TODO staking transfer
      }
      card.save(function (err) {
        if (err) return console.error(err);
      });
      done()
    })
    .catch(function (error) {
      console.error(error)
    })
});
