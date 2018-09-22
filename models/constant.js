'use strict';

let CARD_STATE = {
  BACKLOG:      "BACKLOG",
  NOT_STARTED:  "NOT_STARTED",
  IN_PROGRESS:  "IN_PROGRESS",
  IN_REVIEW:    "IN_REVIEW",
  COMPLETE:     "COMPLETE"
}

module.exports = Object.freeze(CARD_STATE)