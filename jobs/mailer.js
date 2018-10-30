let nodeMailer = require('nodemailer');
let User = require('../models/users');

/**
 * Send celebrate notification to user
 * @param projectName
 * @param user
 */
module.exports.memberSelected = function (projectName, user) {
  sendMail({
    to: user.email,
    subject: `Congratulation ${user.nickname}!`,
    body: `Congratulation ${user.nickname}! You are now member of ${projectName}! Good luck!`
  })
};

/**
 * Send sorry notification to user
 * @param projectName
 * @param user
 */
module.exports.memberNotSelected = function (projectName, user) {
  sendMail({
    to: user.email,
    subject: `Sorry ${user.nickname}...`,
    body: `Unfortunately you did not selected as a member of ${projectName}! Try next time!`
  })
};

module.exports.cardAssigned = function (card, userId) {
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
};

module.exports.notiExpiration = function (card, userId) {
  User.findOne({id: userId})
    .then(function (user) {
      sendMail({
        to: user.email,
        subject: 'Your assignment is about to expire!',
        body: `Hi ${user.nickname}!
        Your assignment ${card.title} is about to expire!`
      })
    })
    .catch(function (err) {
      return console.error(err)
    })
};

let sendMail = function (params) {
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
    from: 'PlayGround@gmail.com',
    to: params.to,
    subject: params.subject,
    text: params.body,
    html: params.body
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) return console.log(error);
    console.log('Message %s sent: %s', info.messageId, info.response);
  });
};
