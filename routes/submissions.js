const Submission = require('../models/submissions');

let express = require('express');
let router = express.Router();

/**
 * Citation API
 */
router.post('/:id/cite', function (req, res) {
  let submissionId = req.params.id;
  let citationId = req.body.citationId;

  Submission.findOne({id: submissionId})
    .then(function (citer) {
      Submission.findOne({id: citationId})
        .then(function (cited) {
          citer.cite(citer.cardId, citationId).save();
          cited.cited(cited.cardId, cited.id).save();
          res.send({message: "Success"});
        })
        .catch(function (e) {
          console.error(e);
          res.send(500, {message: 'Something went wrong'});
        });
    })
    .catch(function (e) {
      console.error(e);
      res.send(500, {message: 'Something went wrong'});
    });
});

module.exports = router;