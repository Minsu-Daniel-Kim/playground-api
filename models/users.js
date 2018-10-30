let mongoose = require('mongoose');

let schema = new mongoose.Schema({
  id: String,
  nickname: String,
  email: String,
  accountAddress: String,
  createdDate: Date,
  reputation: Number,
  profileImageUrl: String, // gravata address
  point: Number,
  role: String,
  projects: [{
    projectId: String,
    joinedAt: Date,
    startedDate: Date,
    endedDate: Date,
    staking: Number,
    status: String
  }],
});

schema.methods.to_json = function () {
  return {
    id: this.id,
    nickname: this.nickname,
    email: this.email,
    accountAddress: this.accountAddress,
    createdDate: this.createdDate,
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
    project.status = "APPLIED";
    project.staking = staking;
  } else {
    this.projects.push({
      projectId: projectId,
      staking: staking,
      status: "APPLIED",
      joinedAt: new Date()
    })
  }
  return this;
};

schema.methods.applied = function (projectId) {
  return this.projects.find(project => project.projectId === projectId).status === "APPLIED";
};

schema.methods.disjoin = function (projectId) {
  let project = this.projects.find(e => e.projectId === projectId);
  project.status = "DISJOIN";
  return this;
};

/**
 * project의 enrollmen가 끝나면 user의 상태를 바꾼다
 * @param projectId
 */
schema.methods.enroll = function (projectId) {
  let project = this.projects.find(e => e.projectId === projectId);
  project.status = "ENROLLED";
};

let User = mongoose.model('User', schema);
module.exports = User;

// let user1 = new User({ id: "abcde", nickname: "kitty", email: "rabierre@gmail.com", reputation: 0, point: 0, createdDate: Date.now()});
// user1.save(function (err, user1) {
//   if (err) return console.error(err);
//   console.log('success to save')
// });

