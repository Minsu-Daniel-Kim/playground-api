var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  id: String,           // projectXXXXXXXX
  name: String,
  description: String,  // description of project
  reputation: Number,
  createdBy: String,
  createdDate: Date,
  startAt: Date,
  endAt: Date,
  history: [],
  members: [{
    userId: String,
    role: String,       // TODO enum
    staking: Number,
    joinedDate: Date,
  }],
  candidates: [{
    userId: String,
    staking: Number,
    joinedDate: Date
  }],
  state: String,        // PREPARE, OPEN, RUNNING, CLOSED
  private: Boolean      // open <-> private
});

schema.methods.to_json = function () {
  return {
    id: this.id,
    name: this.name,
    description: this.description,
    reputation: this.reputation,
    createdDate: this.createdDate,
    startAt: this.startAt,
    endAt: this.endAt,
    owner: this.createdBy,
    tpm: findMemberByRole(this.members, "TPM"),
    state: this.state,
    members: this.members.map(member => {
      return {
        id: member.userId,
        joinedAt: member.joinedDate,
        role: member.role
      }
    }),
    candidates: this.candidates.map(candidate => {
      return {
        id: candidate.userId,
        joinedAt: candidate.joinedDate
      }
    }),
  }
};

function findMemberByRole(members, role) {
  let member = members.find(member => member.role === role);
  if (member === null || member === undefined)
    return null;
  return member.userId;
}

schema.methods.apply = function (userId, staking) {
  this.candidates.push({
    userId: userId,
    staking: staking,
    joinedDate: new Date()
  });
  return this;
};

schema.methods.applied = function (userId) {
  return this.candidates.map(candidate => candidate.userId).includes(userId);
};

schema.methods.disjoin = function (userId) {
  this.candidates = this.candidates.filter(e => e.userId !== userId);
  return this;
};

schema.methods.enroll = function (userId) {
  let candidate = this.candidates.find(e => e.userId === userId);
  this.candidates = this.candidates.filter(e => e.userId !== userId);
  this.members.push({
    userId: userId,
    role: "MEMBER",
    staking: candidate.staking,
    joinedDate: candidate.joinedDate
  });
  return this;
};

schema.methods.enrolled = function (userId) {
  return this.members.map(member => member.userId).includes(userId);
};

schema.methods.withdraw = function (userId) {
  let member = this.members.find(e => e.userId === userId);
  this.members = this.members.filter(member => member.userId !== userId);
  this.candidates.push({
    userId: userId,
    staking: member.staking,
    joinedDate: member.joinedDate
  });
  return this;
};

schema.methods.hasAuth = function (userId, roles) {
  let member = this.members.find(member => member.userId === userId);
  return member !== undefined && roles.includes(member.role);
};

let Project = mongoose.model('Project', schema);
module.exports = Project;