var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  id: String,         // project_XXXXXXXX
  name: String,
  desciption: String, // description of project
  permlink: String,
  createdDate: Date,
  reputation: Number,
  createdDate: Date,
  createdBy: String,
  history: [],
  members: [{
    userId: String,
    joinedDate: Date
  }],
  state: String,    // editing, OPEN, RUNNING, CLOSED
  private: Boolean  // open <-> private
});

schema.methods.to_json = function () {
  return {
    id :         this.id,
    name:        this.name,
    desciption:  this.desciption,
    reputation:  this.reputation,
    createdDate: this.createdDate,
    owner:       this.createdBy,
    state:       this.state,
    members:     this.members.map(member => convert(member)),
  }
}

function convert(member) {
  return {
    id:       member.userId,
    joinedDate: member.joinedDate
  }
}

var Project = mongoose.model('Project', schema);
// new Project({
//   id: "project_XwPp9xaz",
//   name: "부트캠프 1기",
//   desciption: "",
//   reputation: 100,
//   createdDate: Date.now() - (24*60*60*1000*4*30),
//   createdBy: "user_xfdmwXAs",
//   history: [],
//   members: [
//   {
//     userId: "user_xqm5wXXas",
//     joinedDate: Date.now(),
//   }],
//   state: 'CLOSED',
//   private: false
// }).save()

module.exports = Project;