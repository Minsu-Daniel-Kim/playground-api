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
    joinedDate: Date,
    role: []
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
    id:         member.userId,
    joinedDate: member.joinedDate,
    role:       member.role
  }
}

schema.methods.enroll = function(userId) {
  return this.members.push({
    userId: userId,
    joinedDate: new Date(),
    role: ['MEMBER']
  })
}

schema.methods.enrolled = function(userId) {
  return this.members.map(member => member.userId).includes(userId)
}

var Project = mongoose.model('Project', schema);
module.exports = Project;