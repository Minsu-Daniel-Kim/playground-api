var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'hello world' });
});

router.get('/docs', function(req, res, next) {
  res.render('index', { title: 'hello world' });
});

router.get('/test-apis', function(req, res, next) {
  res.send([
    {
      title: '[User]',
      list: [
        {
          comment: 'DB의 모든 유저를 조회한다. 개발용',
          url: "https://snowball-api-backend.herokuapp.com/users",
        },
      ]
    },
    {
      title: '[Card]',
      list: [
        {
          comment: 'DB의 모든 카드를 조회한다. 개발용',
          url: "https://snowball-api-backend.herokuapp.com/cards",
        },
        {
          comment: 'NotStarted',
          url: "https://snowball-api-backend.herokuapp.com/cards/card_4cI8xJf3",
        },
        {
          comment: 'InProgress',
          url: "https://snowball-api-backend.herokuapp.com/cards/card_OVEGWNHj",
        },
        {
          comment: 'InReview',
          url: "https://snowball-api-backend.herokuapp.com/cards/card_xijtCZ9J",
        }
      ]
    },
    {
      title: '[Project]',
      list: [
        {
          comment: 'DB의 모든 프로젝트를 조회한다. 개발용',
          url: "https://snowball-api-backend.herokuapp.com/projects",
        },
        {
          comment: '프로젝트 설명 조회',
          url: "https://snowball-api-backend.herokuapp.com/projects/project_XwPp9xaz",
        },
        {
          comment: '프로젝트가 가진 card 목록 조회',
          url: "https://snowball-api-backend.herokuapp.com/projects/project_XwPp9xaz/cards",
        }
      ]
    }
  ]);
});

module.exports = router;
