let Mailer = require('./mailer');

/**
 * Send voting period start notification
 * @param projectName
 * @param user
 */
module.exports.send = function (projectName, user) {
  Mailer.sendMail({
    to: user.email,
    subject: `${user.nickname}님 투표가 시작되었습니다!`,
    body: ``
  })
};