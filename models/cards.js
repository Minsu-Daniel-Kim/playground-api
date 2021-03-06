let mongoose = require('mongoose');
let randomString = require("randomstring");
let CardState = require('./card_state');

let cardSchema = new mongoose.Schema({
  id: String,
  projectId: String,
  title: String,
  description: String,

  startedDate: Date,
  dueDate: Date,
  ttl: Number,            // TODO delete
  slashCount: Number,     // 남은 slash 횟수
  point: Number,          // 카드가 accept 되었을 때 얻을 수 있는 포인트

  // Assignee
  assigneeId: String,     // assignee id
  staking: Number,        // how much assignee staked
  // submissions: [{
  //   id: String,
  //   url: String,
  //   citations: [{
  //     cardId: String,
  //     sourceId: String,   // submission's id
  //   }],
  //   createdAt: Date
  // }],
  // VOTE
  gained: Number,         // vote로 얻은 점수
  rates: [{
    userId: String,
    point: Number,
    createdDate: Date
  }],
  comments: [{
    id: String,
    parentId: String,
    title: String,
    content: String,
    userId: String,
    createdDate: Date,
    approved: Boolean,
    approver: String
  }],
  // meta information
  createdDate: Date,    // card created time
  createdBy: String,  // card creator id
  state: String,        // BACKlOG, NOT_STARTED, IN_PROGRESS, IN_REVIEW, COMPLETE
  deleted: Boolean,
  history: []
});

cardSchema.statics.new = function (projectId, userId, title, description) {
  return new Card({
    id: "card" + randomString.generate(8),
    projectId: projectId,
    title: (title || ''),
    description: (description || ''),
    state: CardState.BACKLOG,
    history: [],
    comments: [],
    createdBy: userId,
    createdDate: new Date()
  });
};

function getTtl(card) {
  if (card.state !== CardState.IN_PROGRESS)
    return -1;
  return Math.round((card.dueDate - new Date()) / 1000);
}

/**
 * List view에서 보여질 정보를 리턴한다
 * @returns {{id: *, title: *, description: *, state: *, point: *, assigneeId: *}}
 */
cardSchema.methods.shorten = function () {
  return {
    id: this.id,
    title: this.title,
    description: truncate.apply(this.description, [100, true]),
    state: this.state,
    point: this.point,
    label: (this.point || '').toString(),
    assigneeId: this.assigneeId,
    ttl: getTtl(this),
    metadata: {
      title: this.title,
      description: this.description,
      rates: this.rates.map(rate => {
        return {
          userId: rate.userId,
          point: rate.point,
          createdAt: rate.createdDate
        }
      }),
      comments: this.comments.map(comment => {
        return {
          id: comment.id,
          parentId: comment.parentId,
          title: comment.title,
          content: comment.content,
          userId: comment.userId,
          createdAt: comment.createdDate,
          approved: (comment.approved || false),
          approver: (comment.approver || null)
        }
      })
    }
  }
};

function truncate(n, useWordBoundary) {
  if (this.length <= n) {
    return this;
  }
  let subString = this.substr(0, n - 1);
  return (useWordBoundary
    ? subString.substr(0, subString.lastIndexOf(' '))
    : subString) + "";
}

/**
 * Card Detail view에서 보여질 정보를 리턴한다
 * @returns
 */
cardSchema.methods.detail = function () {
  return {
    id: this.id,
    title: this.title,
    description: this.description,
    state: this.state,
    assigneeId: this.assigneeId,
    point: this.point,
    label: (this.point || '').toString(),
    ttl: this.ttl,
    startedDate: this.startedDate,
    dueDate: this.dueDate,
    comments: this.comments.map(comment => {
      return {
        id: comment.id,
        parentId: comment.parentId,
        title: comment.title,
        content: comment.content,
        userId: comment.userId,
        createdAt: comment.createdDate,
        approved: (comment.approved || false),
        approver: (comment.approver || null)
      }
    })
    // rates: this.rates.map(rate => {
    //   return {
    //     userId: rate.userId,
    //     point: rate.point,
    //     createdDate: rate.createdDate
    //   }
    // })
  }
};

function getOrDefault(value, defaultValue) {
  return value !== undefined ? value : defaultValue;
}

cardSchema.methods.all = function () {
  return {
    id: this.id,
    title: this.title,
    description: this.description,
    comments: this.comments,
    startedDate: this.startedDate,
    ttl: this.ttl,
    point: this.point,
    assigneeId: this.assigneeId,
    staking: this.staking,
    gained: this.gained,
    createdDate: this.createdDate,
    createdBy: this.createdBy,
    state: this.state,
  }
};

/**
 * TODO history에 지난 기록 남기기
 */
cardSchema.methods.clear = function () {
  this.startedDate = null;
  this.dueDate = null;
  this.assigneeId = null;
  this.staking = null;
  this.ttl = -1;
  this.slashCount = this.point;
  this.state = CardState.NOT_STARTED;
};

cardSchema.methods.currentState = function () {
  this.state = (this.state || CardState.BACKLOG);
  return this.state;
};

cardSchema.methods.updateState = function (state) {
  this.state = state;
  return this;
};

cardSchema.methods.hasRated = function (userId) {
  return this.rates.map(rate => rate.userId).includes(userId);
};

cardSchema.methods.rate = function (userId, point) {
  this.rates.push({
    userId: userId,
    point: point,
    createdDate: new Date()
  });
  return this;
};

const DELIMITER = "_";

cardSchema.methods.addComment = function (title, content, userId, parentId) {
  this.comments.push({
    id: "comment" + DELIMITER + randomString.generate(8),
    parentId: parentId,
    title: title,
    content: content,
    userId: userId,
    createdDate: new Date()
  });
};

let Card = mongoose.model('Card', cardSchema);

module.exports = Card;

// var randomstring = require("randomstring");
// new Card({
//   id: "card_" + randomstring.generate(8),
//   projectId: "project_XwPp9xaz",
//   title: "관상동맥 변수 설명 데이터 읽고 모르는 부분 조사",
//   description: "관상동맥 변수 설명 데이터에서 모르는 용어에 대해 조사하고 관련 논문을 1편씩 찾은 다음 Notion에 정리한다.",
//   comments: [
//     {
//       title: "와 좋아요",
//       description: "저는 생체나이 데이터 찾아보고 있는데 같이 해요",
//       userId: "user_xfdmwXAs",
//       createdDate: Date.now(),
//       approved: false,
//       approver: null
//     }
//   ],
//   startedDate:  Date.now(),
//   dueDate: Date.now() + 86400 * 1000,
//   timeLimit: 86400,
//   point: 1,
//   assigneeId: "user_xqm5wXXas",
//   ttl: 1427,
//   createdDate:  Date.now(),
//   createdBy: 'user_xfdmwXAs',
//   state: 'IN_PROGRESS',
//   history: [],
// }).save()

// new Card({
//   id: "card_" + randomstring.generate(8),
//   projectId: "project_XwPp9xaz",
//   title: "관상동맥 데이터 보고 아이디어 5개씩 적기",
//   description: "아이디어 5개씩 정리해 Notion에 올려주세요. \n다른 사람의 아이디어와 겹치지 않아야 합니다. \n각 아이디어는 간단한 설명 + 상세한 컨텍스트를 함꼐 기재하여 다른 사람이 아이디어를 실행할 때 바로 이해하고 시작할 수 있는 정도면 좋습니다. 또 외부 데이터가 필요한 경우 외부데이터를 찾아볼 수 있는 키워드나 링크를 첨부하면 더 좋을 것 같습니다",
//   comments: [],
//   point: 1,
//   ttl: 1427,
//   createdDate:  Date.now(),
//   createdBy: 'user_xfdmwXAs',
//   state: 'NOT_STARTED',
//   history: [],
// }).save()

// new Card({
//   id: "card_" + randomstring.generate(8),
//   projectId: "project_XwPp9xaz",
//   title: "과제 1번: PCA로 이미지 압축하기",
//   description: "PCA로 이미지 압축을 해 봅시다. 효과적인 이미지 압축을 위해 몇 개의 PC가 필요한지 찾아봅시다. \n\n다 완료된 과제는 gist로 올려주세요",
//   comments: [],
//   startedDate: Date.now() - 86400 * 1000,
//   dueDate: Date.now(),
//   timeLimit: 6431,
//   point: 2,
//   assigneeId: "user_xqm5wXXas",
//   ttl: 1427,
//   createdDate:  Date.now(),
//   createdBy: 'user_xfdmwXAs',

//   state: 'IN_REVIEW',
//   history: [],
// }).save()

// new Card({
//   id: "card_" + randomstring.generate(8),
//   projectId: "project_XwPp9xaz",
//   title: "피처별 중요도 계산하기",
//   description: "모델을 실행할 때 모든 피처를 좋겠지만 계산 비용을 줄이기 위해 피처엔지니어링은 필수입니다. 또 피처간의 상관관계를 알 수 있으면 더 효과적인 모델을 찾을 수 있을 것입니다. 먼저 EDA를 통해 중요한 피처와 그렇지 않은 피처를 알아내 봅시다.",
//   comments: [
//     {
//       title: "질문",
//       content: "피처별 중요도는 어떻게 확인하나요??",
//       userId: "user_xqm5wXXas",
//       createdDate: Date.now(),
//       approved: false,
//       approver: null
//     }
//   ],
//   createdDate:  Date.now(),
//   createdBy: 'user_xfdmwXAs',
//   state: 'BACKLOG',
//   history: [],
// }).save()

// new Card({
//   id: "card_" + randomstring.generate(8),
//   projectId: "project_XwPp9xaz",
//   title: "과제 0번: 자기소개 쓰기",
//   description: "안녕하세요! 프로젝트 A에 참여해 주셔서 감사합니다! 한달동안 함께 프로젝트를 할 사람들에게 자기 소개를 해 봅시다!",
//   startedDate: Date.now() - 86400 * 1000,
//   dueDate: Date.now(),
//   timeLimit: 28800,
//   point: 1,
//   assigneeId: "user_xqm5wXXas",
//   ttl: 4431,
//   createdDate:  Date.now(),
//   createdBy: 'user_xfdmwXAs',
//   state: 'COMPLETE',
//   gained: 1,
//   history: [],
//     comments: [
//     {
//       id: "comment_dfsADr23",
//       title: "음...",
//       description: "참여자가 저밖에 없어요....",
//       userId: "user_xqm5wXXas",
//       createdDate: Date.now(),
//       approved: true,
//       approver: "user_xfdmwXAs"
//     },
//     {
//       id: "comment_" + randomstring.generate(8),
//       parentId: "comment_dfsADr23",
//       title: "ㅜㅜ",
//       description: "ㅠㅠㅠㅠㅠ",
//       userId: "user_xqm5wXXas",
//       createdDate: Date.now(),
//       approved: false,
//     }
//   ],
// }).save()


