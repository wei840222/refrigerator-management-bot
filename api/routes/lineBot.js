const express = require('express')
const lineBot = require('@line/bot-sdk')
const msgFactory = require('../src/msgFactory.js')
const axios = require('axios')
const backendApi = axios.create({
  baseURL: process.env.API_URL
})
const fs = require('fs');

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}

// create LINE SDK client
const client = new lineBot.Client(config)

// create Express instance
const router = express()

// register a webhook handler with middleware
router.post('/lineBot', lineBot.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err)
      res.status(500).end()
    })
})

// register api for push expirationReminder to user
router.get('/lineBot/multicast/expirationReminder', (req, resp) => {
  backendApi.get('user/userId/get_uid')
    .then(res => {
      const userIdArray = res.data.uidlist.map(element => element.uid)
      backendApi.get('/cabinet/userId/item_in_refrigerator')
        .then(res => {
          const expirationReminder = msgFactory.expirationReminder(res.data.refrigeratorList)
          client.multicast(userIdArray, expirationReminder)
          return resp.json({ userIdArray: userIdArray, expirationReminder: expirationReminder })
        })
        .catch(err => {
          console.log(err)
          return resp.send(500, err);
        })
    })
    .catch(err => {
      console.log(err)
      return resp.send(500, err);
    })
})

// callback function to handle a single event
function handleEvent(event) {
  switch (event.type) {
    case 'follow':
      console.log(`Followed this bot: ${JSON.stringify(event)}`);
      client.replyMessage(event.replyToken, msgFactory.flexSingle(require('../src/greeting.json'), 'Hi~我是冰箱君'))
      backendApi.get('user/userId/get_uid')
        .then(res => {
          if (res.data.uidlist.find(element => element.uid === event.source.userId) === undefined)
            backendApi.post('/user/userId/post_uid', { uid: event.source.userId }).then(res => console.log(res.data)).catch(err => console.log(err))
        })
        .catch(err => console.log(err))
      return
    case 'unfollow':
      return console.log(`Unfollowed this bot: ${JSON.stringify(event)}`);
    case 'message':
      const message = event.message;
      switch (message.type) {
        case 'text':
          return handleText(message, event.replyToken, event.source);
        case 'image':
          handleImage(message, event.replyToken)
            .then(downloadPath => {
              console.log(downloadPath)
              backendApi.get(`/user/downloadFile/${downloadPath}`)
                .then(res => console.log(res.data))
                .catch(err => console.log(err))
            })
            .catch(err => console.log(err))
          return
        default:
          throw new Error(`Unknown message: ${JSON.stringify(message)}`);
      }
    case 'postback':
      if (event.postback.data === 'start') {
        client.replyMessage(event.replyToken, [msgFactory.starterShoppingList, msgFactory.starterRefrigeratorList])
      }
      else if (event.postback.data === 'invoice') {
        client.replyMessage(event.replyToken, [{ type: 'text', text: '正在解析您輸入的發票' }, { type: 'text', text: '正在幫您將食物輸入冰箱...' }, { type: 'sticker', packageId: 2, stickerId: 176 }])
      }
      else if (event.postback.data === 'vehicle') {
        client.replyMessage(event.replyToken, { type: 'text', text: '功能尚在開發中...' })
      }
      else if (event.postback.data.includes('eaten')) {
        const id = event.postback.data.split('=')[1]
        backendApi.post('/cabinet/userId/eaten', { 'id': id })
          .then(res => {
            console.log(res.data)
            if (res.data === 'Status has been set eaten.')
              client.replyMessage(event.replyToken, [{ type: 'text', text: '恭喜你又消滅了一項食物！期待下次再一起去血拼！' }, { type: 'sticker', packageId: 2, stickerId: 516, }])
          })
          .catch(err => console.log(err))
      }
      else if (event.postback.data.includes('unnotify')) {
        const id = event.postback.data.split('=')[1]
        backendApi.post('/cabinet/userId/unnotify', { 'id': id })
          .then(res => {
            console.log(res.data)
            if (res.data === 'Notify has been turned off.')
              client.replyMessage(event.replyToken, [{ type: 'text', text: '好der！要趕快吃完喔！' }, { type: 'sticker', packageId: 2, stickerId: 165, }])
          })
          .catch(err => console.log(err))
      }
      else if (event.postback.data.includes('recipe')) {
        const food = event.postback.data.split('=')[1]
        switch (food) {
          case '大白菜':
            client.replyMessage(event.replyToken, msgFactory.flexCarousel([require('../src/recipe/1.json'), require('../src/recipe/2.json')], '大白菜推薦食譜'))
            break
          case '牛肉片':
            client.replyMessage(event.replyToken, msgFactory.flexCarousel([require('../src/recipe/2.json'), require('../src/recipe/1.json')], '牛肉片推薦食譜'))
            break
        }
      }
      else if (event.postback.data.includes('seeMore')) {
        const startIdx = event.postback.data.split('=')[1]
        backendApi.get('/cabinet/userId/item_in_refrigerator')
          .then(res => client.replyMessage(event.replyToken, msgFactory.expirationReminder(res.data.refrigeratorList, startIdx)))
          .catch(err => console.log(err))
      }
      console.log(`Got postback: ${event.postback.data}`)
      return
    default:
      throw new Error(`Unknown event: ${JSON.stringify(event)}`);
  }
}

function handleText(message, replyToken, source) {
  switch (message.text) {
    case '新增清單':
      client.replyMessage(replyToken, msgFactory.addList)
      return;
    case '過期提醒':
      backendApi.get('/cabinet/userId/item_in_refrigerator')
        .then(res => client.replyMessage(replyToken, msgFactory.expirationReminder(res.data.refrigeratorList)))
        .catch(err => console.log(err))
      return;
    case '罐頭':
      client.replyMessage(replyToken, msgFactory.easyExpireReminder(message.text))
      return;
    case '伺服器狀態':
      backendApi.get('/')
        .then(res => {
          if (res.status === 200)
            client.replyMessage(replyToken, { type: 'text', text: '前後端伺服器運行中！' })
        })
        .catch(err => console.log(err))
      return;
    default:
      console.log(`Message from ${replyToken}: ${message.text}`);
  }
}

function handleImage(message, replyToken) {
  client.replyMessage(replyToken, [{ type: 'text', text: '正在幫您將食物輸入冰箱...' }, { type: 'sticker', packageId: 2, stickerId: 176 }])
  const downloadPath = `/app/static/${message.id}.jpg`;
  return client.getMessageContent(message.id)
    .then(stream => new Promise((resolve, reject) => {
      const writable = fs.createWriteStream(downloadPath);
      stream.pipe(writable);
      stream.on('end', () => resolve(`${message.id}.jpg`));
      stream.on('error', reject);
    }))
    .catch(err => console.log(err))
}

module.exports = router
