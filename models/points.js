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

schema.methods.add = function (id, point, type) {
  this.totalPoint = (this.totalPoint || 0) + point;
  this.histories.push({
    sourceId: id,
    type: type, // CARD, COMMENT, CITE, CITED
    point: point,
    createdAt: new Date()
  });
  return this;
};

let PointPool = mongoose.model('PointPool', schema);
module.exports = PointPool;