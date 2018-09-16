var nodeMailer = require('nodemailer');
var bodyParser = require('body-parser');

var Card = require('../models/cards');
var User = require('../models/users');

// TODO agenda job
module.exports.cardAssigned = function(cardId, userId) {
  User.findOne({id: userId}, function (err, user) {
    if (err) return console.error(err)

    Card.findOne({id: cardId}, function (err, card) {
      if (err) return console.error(err)

      sendMail({
        to: user.email,
        subject: `Cheer up ${user.nickname}!`,
        body: `You just started ${card.title}! Good luck!`
      })
    })
  })

}

var sendMail = function (params) {
  let transporter = nodeMailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "enei2cpwvlmrfm7m@ethereal.email",
      pass: "FEyAbxx9NVFHs4dBam"
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
