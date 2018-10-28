var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  id: String,           // projectXXXXXXXX
  name: String,
  description: String,  // description of project
  permlink: String,
  reputation: Number,
  createdBy: String,
  createdDate: Date,
  startAt: Date,
  endAt: Date,
  history: [],
  members: [{
    userId: String,
    joinedDate: Date,
    role: String        // TODO enum
  }],
  candidates: [{
    userId: String,
    staking: Number,
    joinedDate: Date
  }],
  state: String,        // editing, OPEN, RUNNING, CLOSED
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
  if (member !== null || member !== undefined)
    return member.userId;
  return null;
}

schema.methods.enroll = function (userId) {
  return this.members.push({
    userId: userId,
    role: 'MEMBER',
    joinedDate: new Date()
  })
};

schema.methods.enrolled = function (userId) {
  return this.members.map(member => member.userId).includes(userId)
};

schema.methods.hasAuth = function (userId, roles) {
  let member = this.members.find(member => member.userId === userId);
  return member !== undefined && roles.includes(member.role);
};

let Project = mongoose.model('Project', schema);
module.exports = Project;