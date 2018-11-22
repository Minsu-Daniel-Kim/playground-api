let randomString = require('randomstring');
let mongoose = require('mongoose');
let AuthType = require('../modules/authentications');

let schema = new mongoose.Schema({
  id: String,
  nickname: String,
  email: String,
  accountAddress: String,
  profileImageUrl: String, // gravata address
  reputation: Number,
  qualified: Boolean,
  qualifier: String, // adminId
  role: String,      // auth
  authentication: {
    // id: String,
    // type: String,
  },
  projects: [{
    projectId: String,
    joinedAt: Date,
    startedDate: Date,
    endedDate: Date,
    staking: Number,
    gainedPoint: Number,
    state: String //"APPLIED", "WITHDRAW", "APPROVED
  }],
  signUpComplete: Boolean,
  createdAt: Date,
  createdDate: Date, // TODO delete this
});

const DELIMITER = "_";

schema.statics.new = function (authId, authType, nickname, profileImage, email) {
  return new User({
      id: "user" + DELIMITER + randomString.generate(8),
      email: email,
      nickname: nickname,
      profileImageUrl: profileImage,
      reputation: 0,
      qualified: false,
      role: AuthType.MEMBER,
      authentication: {
        id: authId,
        type: authType
      },
      signUpComplete: false,
      createdAt: new Date()
    }
  );
};

schema.methods.to_json = function () {
  return {
    id: this.id,
    nickname: this.nickname,
    email: this.email,
    accountAddress: this.accountAddress,
    createdAt: this.createdDate,
    coinBalance: 0,
    reputation: this.reputation,
    role: this.role,
    profileImageUrl: this.profileImageUrl,
    projects: this.projects
  }
};

schema.methods.apply = function (projectId, staking) {
  let project = this.projects.find(e => e.projectId === projectId);
  if (project !== undefined && project !== null) {
    project.state = "APPLIED";
    project.staking = staking;
  } else {
    this.projects.push({
      projectId: projectId,
      staking: staking,
      state: "APPLIED",
      joinedAt: new Date()
    })
  }
  return this;
};

schema.methods.applied = function (projectId) {
  let project = this.projects.find(project => project.projectId === projectId);
  return project !== undefined && project !== null && project.state === "APPLIED";
};

schema.methods.withdraw = function (projectId) {
  let project = this.projects.find(e => e.projectId === projectId);
  project.state = "WITHDRAW";
  return this;
};

/**
 * project의 enrollment가 끝나면 user의 상태를 바꾼다
 * @param projectId
 */
schema.methods.enroll = function (projectId) {
  let project = this.projects.find(e => e.projectId === projectId);
  project.state = "APPROVED";
  return this;
};

let User = mongoose.model('User', schema);
module.exports = User;
