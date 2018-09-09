var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  id: String, // use uuid
  nickname: String,
  email: String,
  accountAddress: String,
  createdDate: Date,
  reputation: Number,
  profileImageUrl: String, // gravata address
  point: Number,
  projects: [{
      projectId: String,
      startedDate: Date,
      endedDate: Date,
      point: Number,
      stacking: Number
      }
    ]
  // history
});

schema.methods.to_json = function () {
  return {
    id : this.id,
    nickname: this.nickname,
    email: this.email,
    accountAddress: this.accountAddress,
    createdDate: this.createdDate,
    reputation: this.reputation,
    profileImageUrl: this.profileImageUrl
  }
}

var User = mongoose.model('User', schema);
// var user1 = new User({ id: "abcde", nickname: "kitty", email: "rabierre@gmail.com", reputation: 0, point: 0, createdDate: Date.now()});
// user1.save(function (err, user1) {
//   if (err) return console.error(err);
//   console.log('success to save')
// });

module.exports = User;