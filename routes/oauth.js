let User = require('../models/users');
let express = require('express');
let router = express.Router();

// { id: 963949131,
//   properties:
//   { nickname: '서지혜',
//     profile_image:
//     'http://k.kakaocdn.net/dn/bsbq1w/btqqH6AX20d/X6K5ll5afCLANImFv2kbv1/profile_640x640s.jpg',
//       thumbnail_image:
//     'http://k.kakaocdn.net/dn/bsbq1w/btqqH6AX20d/X6K5ll5afCLANImFv2kbv1/profile_110x110c.jpg' },
//   kakao_account:
//   { has_email: true,
//     is_email_valid: true,
//     is_email_verified: true,
//     email: 'rabierre@naver.com',
//     has_age_range: false,
//     has_birthday: false,
//     has_gender: false } }

router.post('/', function (req, res) {
  console.log(JSON.parse(req.body.data));
  let data = JSON.parse(req.body.data);
  let authId = data.id;
  let nickname = data.properties.nickname;
  let profileImage = data.properties.profileImage;
  let email = data.kakao_account.email;

  // authentication의 id로 userId를 리턴한다
  User.findOne({"authentication.id": authId})
    .then(function (user) {
      if (user === null || user === undefined) {
        User.new(authId, nickname, profileImage, email).save()
          .then(function (saved) {
            return res.send(saved);
          })
          .catch(function (e) {
            console.error(e);
            return res.send(500, {message: `Something went wrong: ${e.toString()}`});
          });
      }
      else {
        return res.send({userId: user.id});
      }
    })
    .catch(function (e) {
      console.error(e);
      return res.send(500, {message: `Something went wrong: ${e.toString()}`});
    });
});

router.post('/user-info', function (req, res) {
});

// TODO user의 정보를 저장한다
// router.post('/signup', function (req, res) {
//   User.findOne()
//     .then()
//     .catch();
// });


module.exports = router;