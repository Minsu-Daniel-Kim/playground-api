let mongoose = require('mongoose');
let randomString = require("randomstring");
let Authentocation = require('../modules/authentications');

let schema = new mongoose.Schema({
  id: String,           // projectXXXXXXXX
  name: String,
  description: String,  // description of project
  startAt: Date,
  endAt: Date,
  private: Boolean,      // open <-> private
  memberCount: {
    min: Number,
    max: Number
  },
  requirement: {
    stakingAmount: Number,
    reputation: Number,
  },
  // voting period sprintCount 만큼 지정된다
  sprintCount: Number,
  sprints: [{
    id: String,
    startAt: Date,   // 월
    endAt: Date,     // 일
    voteEndAt: Date, // 토
  }],
  votingPeriods: [{
    id: String,
    cardCount: Number,
    startAt: Date,
    endAt: Date
  }],
  poolAllocation: {
    tmp: Number,
    member: Number
  },
  openFunding: Boolean,
  members: [{
    userId: String,
    role: String,       // see Authentocation
    staking: Number,
    joinedDate: Date,
  }],
  candidates: [{
    userId: String,
    staking: Number,
    joinedDate: Date
  }],
  state: String,        // TEMP, OPEN, STARTED, FINISHED
  qualified: Boolean,
  qualifier: String, // adminId
  createdBy: String,
  createdDate: Date
});

const DELIMITER = "_";

schema.statics.new = function (name, desc, startAt, endAt, createdBy) {
  return new Project({
    id: "project" + DELIMITER + randomString.generate(8),
    name: name,
    description: desc,
    state: "TEMP",
    members: [],
    candidates: [],
    votingPeriods: [],
    createdBy: createdBy,
    createdDate: new Date()
  });
};

schema.methods.to_json = function () {
  return {
    id: this.id,
    name: this.name,
    description: this.description,
    reputation: this.requirement.reputation,
    stakingAmount: this.requirement.stakingAmount,
    startAt: this.startAt,
    endAt: this.endAt,
    owner: this.createdBy,
    tpm: findMemberByRole(this.members, Authentocation.TPM),
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
    createdDate: this.createdDate,
  }
};

function findMemberByRole(members, role) {
  let member = members.find(member => member.role === role);
  if (member === null || member === undefined)
    return null;
  return member.userId;
}

schema.methods.tpm = function () {
  return findMemberByRole(this.members, Authentocation.TPM)
};

schema.methods.students = function () {
  return this.members.filter(e => e.role === Authentocation.MEMBER);
};

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

schema.methods.withdraw = function (userId) {
  this.candidates = this.candidates.filter(e => e.userId !== userId);
  return this;
};

/**
 * TPM이 candidate를 멤버로 지정한다
 * @param userId
 * @returns {mongoose.Schema.methods}
 */
schema.methods.approve = function (userId) {
  let candidate = this.candidates.find(e => e.userId === userId);
  this.candidates = this.candidates.filter(e => e.userId !== userId);
  this.members.push({
    userId: userId,
    role: Authentocation.MEMBER,
    staking: candidate.staking,
    joinedDate: candidate.joinedDate
  });
  return this;
};

schema.methods.enrolled = function (userId) {
  return this.members.map(member => member.userId).includes(userId);
};

/**
 * TPM이 멤버를 candidate로 변경한다.
 * @param userId
 * @returns {mongoose.Schema.methods}
 */
schema.methods.disapprove = function (userId) {
  let member = this.members.find(e => e.userId === userId);
  this.candidates.push({
    userId: userId,
    staking: member.staking,
    joinedDate: member.joinedDate
  });
  this.members = this.members.filter(member => member.userId !== userId);
  return this;
};

schema.methods.isAdmin = function (userId) {
  if (userId === "user2222")
    return true;
};

schema.methods.hasAuth = function (userId, roles) {
  let member = this.members.find(member => member.userId === userId);
  return member !== undefined && roles.includes(member.role);
};

schema.methods.changeState = function (nextState) {
  this.state = nextState;
  return this;
};

let Project = mongoose.model('Project', schema);
module.exports = Project;