const Agenda = require('agenda');

const agenda = new Agenda({db: {address: process.env.DATABASE_URL, collection: 'agendaJobs'}})
  .defaultLockLifetime(2000)
  .processEvery('1 second')
  .defaultConcurrency(200);

// let jobTypes = process.env.JOB_TYPES ? process.env.JOB_TYPES.split(',') : [];
// jobTypes.forEach(function(type) {
//   require(`./${type}.js`);
// });

agenda.on('ready', function() {
  console.log("agenda ready");
  agenda.start();
});

async function graceful() {
  await agenda.stop();
  process.exit(0);
}

process.on('SIGTERM', graceful);
process.on('SIGINT' , graceful);

module.exports = agenda;