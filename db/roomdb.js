const redis = require('redis')
const redisClient = redis.createClient()

redisClient.on('connect', function () {
  console.log('connected')
})
redisClient.on('error', function (err) {
  throw new Error(err)
})
class Rooms {
  static saveGroupDetailList (obj, cb) {
    redisClient.hmset('groupDetailObj', {
      'groupName': obj.groupName,
      'admin': obj.admin,
      'users': JSON.stringify(obj.users)
    })
    Rooms.saveUserDetailList(obj)
    redisClient.hgetall('groupDetailObj', (err, groupDetailObj) => {
      if (err) throw new Error(err)
      redisClient.rpush('groupDetailList', JSON.stringify(groupDetailObj), (err, reply) => {
        if (err) throw new Error(err)
        console.log('number Of rooms = ', reply)
        cb(reply)
      })
    })
  }
  static getGroupDetailList (groupIndex, cb) {
    redisClient.lindex('groupDetailList', groupIndex, (err, obj) => {
      if (err) throw new Error(err)
      console.log('obj from lindex --> ', obj)
      console.log('parsed obj-> ', JSON.parse(obj))
      cb(JSON.parse(obj))
    })
  }
  static saveUserDetailList (obj) {
    console.log('<roomdb.js saveUserDetailList> obj -> ', obj)
    let groupName = obj.groupName
    let users = obj.users
    let admin = obj.admin
    if (users.indexOf(admin) === -1) users.push(admin)
    for (let user of users) {
      redisClient.rpush(user, groupName)
    }
  }
  static getUserDetailList (userName, cb) {
    redisClient.lrange(userName, 0, -1, (err, list) => {
      console.log('<roomdb.js, getUserDetailList > userList ', list)
      if (err) throw new Error(err)
      cb(list)
    })
  }
  static saveGroupMessage (msg, sender, cb) {
    redisClient.hmset('messageSenderObj', {
      'sender': sender,
      'text': msg.text
    })
    redisClient.hgetall('messageSenderObj', (err, messageSenderObj) => {
      if (err) throw new Error(err)
      redisClient.rpush(msg.groupName, JSON.stringify(messageSenderObj), (err, reply) => {
        if (err) throw new Error(err)
        console.log('total message count in ', msg.groupName, ' ', reply)
        cb(reply)
      })
    })
  }
  static getGroupMessages (groupName, cb) {
    redisClient.lrange(groupName, 0, -1, (err, messagesList) => {
      if (err) throw new Error(err)
      console.log('<roomdb.js getGroupMessages > messagesList = ', messagesList)
      //parseMessages(JSON.parse(messagesList))
      console.log('<roomdb.js getGroupMessages > messages = ', messagesList)
      cb(messagesList)
    })
  }
}
const parseMessages = messageList => {
  //for
}

// module.exports = db
module.exports.Rooms = Rooms
