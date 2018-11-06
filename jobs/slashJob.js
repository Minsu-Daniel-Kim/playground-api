const Card = require('../models/cards');
const agenda = require('./agenda');
const CardState = require('../models/card_state');
const TokenPool = require('../models/tokens');
const fsm = require('../tasks/cardstate');


const SLASH_AMOUNT = 1;

function takeTokens(card, amount, type, reason) {
  // TODO staking pool에서 꺼내가야함
  TokenPool.findOne({userId: card.assigneeId, projectId: card.projectId})
    .then(pool => pool.log(card.id, amount, type, reason).save())
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

      if (card.slashCount  > 0) {
        card.slashCount -= SLASH_AMOUNT;
        takeTokens(card, -1 * SLASH_AMOUNT, "SLASH", "slash");
      } else {
        // slash count == point이므로 이미 slash 할 토큰이 없음
        fsm.goto(card.currentState());
        fsm.timesup(card);
        // if (card.remainPoint > 0)
        //   takeTokens(card, -1 * card.remainPoint, "TIME_OUT", "time out");
        job.remove();
      }
      card.save(function (err) {
        if (err) console.error(err);
        console.log(`timeout ${cardId}`);
      });
      done()
    })
    .catch(function (error) {
      console.error(error)
    })
});
