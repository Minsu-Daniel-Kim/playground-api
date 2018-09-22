var nodeMailer = require('nodemailer');
var bodyParser = require('body-parser');

var Card = require('../models/cards');
var User = require('../models/users');

// TODO agenda job
module.exports.cardAssigned = function(card, userId) {
  User.findOne({id: userId})
  .then(function (user) {
    sendMail({
      to: user.email,
      subject: `Cheer up ${user.nickname}!`,
      body: `You just started ${card.title}! Good luck!`
    })
  })
  .catch(function (err) {
    return console.error(err)
  })
}

module.exports.notiExpiration = function(card, userId) {
  User.findOne({id: userId})
  .then(function(user) {
    sendMail({
      to: user.email,
      subject: 'Youre assignment is about to expire!',
      body: `Hi ${user.nickname}!
        Youre assignment ${card.title} is about to expire!`
    })
  })
  .catch(function (err) {
    return console.error(err)
  })
}

var sendMail = function (params) {
  let transporter = nodeMailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: (process.env.SMTP_SECURE === 'true'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });

  let mailOptions = {
      from:     'playGround@gmail.com',
      to:       params.to,
      subject:  params.subject,
      text:     params.body,
      html:     params.body
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.log(error);
    }
    console.log('Message %s sent: %s', info.messageId, info.response);
  });
}
