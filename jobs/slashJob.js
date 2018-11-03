const Card = require('../models/cards');
const agenda = require('./agenda');
const CardState = require('../models/card_state');
const TokenPool = require('../models/tokens');
const fsm = require('../tasks/cardstate');

const MS_PER_HOUR = 1000 * 60 * 60;
const SLASH_AMOUNT = 1;

function takeTokens(card, amount, type, reason) {
  TokenPool.find({userId: card.assigneeId, projectId: card.projectId})
    .then(pool => pool.log(card.id, card.projectId, amount, type, reason))
    .then(pool => pool.save())
    .catch(function (e) {
      console.error(e);
    });
}

agenda.define('slash', (job, done) => {
  let cardId = job.attrs.data.cardId;
  console.log(`slash ${cardId} ${new Date().toLocaleString()}`);

  Card.findOne({id: cardId})
    .then(function (card) {
      if (card.currentState() !== CardState.IN_PROGRESS) {
        job.remove();
        done();
        return;
      }

      card.ttl -= MS_PER_HOUR;
      if (card.ttl > 0) {
        card.remainPoint -= SLASH_AMOUNT;
        // slash
        takeTokens(card, -1 * SLASH_AMOUNT, "SLASH", "slash");
      } else {
        fsm.goto(card.currentState());
        fsm.timesup(card);
        // take token
        if (card.remainPoint > 0)
          takeTokens(card, -1 * card.remainPoint, "TIME_OUT", "time out");
        job.remove();
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
