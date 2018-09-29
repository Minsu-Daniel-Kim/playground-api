var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  id: String,         // project_XXXXXXXX
  name: String,
  description: String, // description of project
  permlink: String,
  reputation: Number,
  createdBy: String,
  createdDate: Date,
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
    description:  this.description,
    reputation:  this.reputation,
    createdDate: this.createdDate,
    owner:       this.createdBy,
    state:       this.state,
    members:     this.members.map(member => convert(member)),
  }
};

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
};

schema.methods.enrolled = function(userId) {
  return this.members.map(member => member.userId).includes(userId)
};

let Project = mongoose.model('Project', schema);
module.exports = Project;