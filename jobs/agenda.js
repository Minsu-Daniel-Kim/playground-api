const Agenda = require('agenda');

// const dbendpoint = 'mongodb://localhost:27017/Snowball';
// let agenda = new Agenda({db: {address: dbendpoint, collection: 'jobs'}});
// const agenda = new Agenda({defaultLockLifetime: 10000});

// DATABASE_URL='mongodb://localhost:27017/Snowball'
const agenda = new Agenda({db: {address: 'localhost:27017/agenda-test', collection: 'agendaJobs'}});

// let jobTypes = process.env.JOB_TYPES ? process.env.JOB_TYPES.split(',') : [];
// jobTypes.forEach(function(type) {
//   require(`./${type}.js`);
// });

agenda.on('ready', function() {
  console.log("agenda ready")
  agenda.start();
});

// agenda.on('ready', function() {
//   agenda.schedule('now', 'post recurring stocks');
//   agenda.schedule('in 5 minutes', 'post recurring stocks');
// });

async function graceful() {
  await agenda.stop();
  process.exit(0);
}

process.on('SIGTERM', graceful);
process.on('SIGINT' , graceful);

module.exports = agenda;