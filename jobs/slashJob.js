const Card = require('../models/cards');
const agenda = require('./agenda');
const CardState = require('../models/card_state');
const TokenPool = require('../models/tokens');
const fsm = require('../tasks/cardstate');


const SLASH_AMOUNT = 1;

function slash(card, amount) {
  TokenPool.findOne({userId: card.assigneeId, projectId: card.projectId})
    .then(pool => pool.slash(card.id, amount).save())
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

      // slashCount 는 card의 point와 같음
      if (card.slashCount === undefined)
        card.slashCount = card.point;
      card.slashCount -= SLASH_AMOUNT;
      slash(card, SLASH_AMOUNT);

      if (card.slashCount <= 0) {
        fsm.goto(card.currentState());
        fsm.timesup(card);
        job.remove();
      }
      card.save(function (err) {
        if (err) console.error(err);
      });
      done()
    })
    .catch(function (error) {
      console.error(error)
    })
});
