const Card = require('../models/cards');
const agenda = require('./agenda');
const CardState = require('../models/card_state');
const fsm = require('../tasks/cardstate');


agenda.define('taskTimeout', (job, done) => {
  let cardId = job.attrs.data.cardId;
  console.log(`slash ${cardId} ${new Date().toLocaleString()}`);

  Card.findOne({id: cardId})
    .then(function (card) {
      if (card.currentState() !== CardState.IN_PROGRESS) {
        job.remove();
        done();
        return;
      }

      fsm.goto(card.currentState());
      fsm.timesup(card);

      card.save(function (err) {
        if (err) console.error(err);
      });
      // job.remove();
      done();
    })
    .catch(function (error) {
      console.error(error)
    })
});
