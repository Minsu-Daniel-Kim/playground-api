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
    .then(function (sub) {
      Submission.findOne({id: citationId})
        .then(function (found) {
          sub.citations.push({
            cardId: found.id,
            sourceId: citationId
          });
          sub.save();
        });
    });
});

module.exports = router;