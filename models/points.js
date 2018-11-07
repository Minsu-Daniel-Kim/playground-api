var mongoose = require('mongoose');
let randomstring = require("randomstring");

var schema = new mongoose.Schema({
  id: String,
  userId: String,
  projectId: String,
  totalPoint: Number,

  histories: [{
    //   sourceId: String,
    //   type: String,
    //   desc: String,
    //   point: Number,
    //   createdAt: Date
  }],
  expectTransDate: Date, // reputation 변환 예정일
  realTransDate: Date,   // 실제 변환일
  createdBy: String,
  createdAt: Date,
  modifiedAt: Date
});

schema.statics.new = function (projectId, userId, giver) {
  return new PointPool({
    id: "pointpool" + randomstring.generate(8),
    projectId: projectId,
    userId: userId,
    totalPoint: 0,
    histories: [],
    createdBy: giver,
    createdAt: new Date(),
    modifiedAt: new Date()
  })
};

schema.methods.add = function (id, point, type, reason) {
  this.totalPoint += point;
  this.histories.push({
    sourceId: id,
    type: type, // CARD, COMMENT
    desc: reason,
    point: point,
    createdAt: new Date()
  });
};

let PointPool = mongoose.model('PointPool', schema);
module.exports = PointPool;