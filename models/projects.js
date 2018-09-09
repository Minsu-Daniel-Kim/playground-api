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
  state: String,    // editing, ready, in progress, ended
  private: Boolean  // open <-> private
});

schema.methods.to_json = function () {
  return {
    id : this.id,
    name: this.name,
    desciption: this.desciption,
    reputation: this.reputation,
    createdDate: this.createdDate,
    createdBy: this.createdBy,
    members: this.members,
    state: this.state,
  }
}

var Project = mongoose.model('Project', schema);

module.exports = Project;