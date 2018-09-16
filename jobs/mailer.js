var nodeMailer = require('nodemailer');
var bodyParser = require('body-parser');

// app.use(express.static(path.join(__dirname, 'public')));
// bodyParser.urlencoded({extended: true}
// app.use(bodyParser.json());

const sendMail = function (params) {
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

module.exports = sendMail;