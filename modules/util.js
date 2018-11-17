'use strict';

module.exports.wordCount = function (xs) {
  return xs.reduce(function (rv, x) {
    rv[x] = (rv[x] || 0) + 1;
    return rv;
  }, {});
};

module.exports.toMap = function (xs, key) {
  return xs.reduce(function (rv, x) {
    rv[x[key]] = x;
    return rv;
  }, {});
};

module.exports.groupBy = function (xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};