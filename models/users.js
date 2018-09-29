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
      staking: Number
    }
  ]
});

schema.methods.to_json = function () {
  return {
    id : this.id,
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

schema.methods.enroll = function (projectId, staking) {
  this.projects.push({
    projectId: projectId,
    staking: staking,
    joinedAt: new Date()
  })
};

schema.methods.enrolled = function(projectId) {
  return this.projects.map(project => project.projectId).includes(projectId)
};

let User = mongoose.model('User', schema);
module.exports = User;

// let user1 = new User({ id: "abcde", nickname: "kitty", email: "rabierre@gmail.com", reputation: 0, point: 0, createdDate: Date.now()});
// user1.save(function (err, user1) {
//   if (err) return console.error(err);
//   console.log('success to save')
// });

