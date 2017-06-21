const redis = require('redis')
const redisClient = redis.createClient()
const _groupExtn = '_grp'
const _userExtn = '_users'
const _messages = '_msgs'
redisClient.on('connect', function () {
  console.log('connected')
})
redisClient.on('error', function (err) {
  throw new Error(err)
})
class Rooms {
  // static saveGroupDetailList (obj, cb) {
  //   redisClient.hmset('groupDetailObj', {
  //     'groupName': obj.groupName,
  //     'admin': obj.admin,
  //     'users': JSON.stringify(obj.users)
  //   })
  //   Rooms.saveUserDetailList(obj)
  //   redisClient.hgetall('groupDetailObj', (err, groupDetailObj) => {
  //     if (err) throw new Error(err)
  //     redisClient.rpush('groupDetailList', JSON.stringify(groupDetailObj), (err, reply) => {
  //       if (err) throw new Error(err)
  //       console.log('number Of rooms = ', reply)
  //       cb(reply)
  //     })
  //   })
  // }
  static saveGroupDetail (obj, cb) {
    Rooms.saveUserDetailList(obj)
    redisClient.hmset('groupAdminSet', obj.groupName, obj.admin)
    obj.users.forEach(user => {
      redisClient.rpush(obj.groupName.concat(_userExtn), user)
    })
    cb()
  }

  // static getGroupDetailObj (groupIndex, cb) {
  //   redisClient.lindex('groupDetailList', groupIndex, (err, obj) => {
  //     if (err) throw new Error(err)
  //     console.log('obj from lindex --> ', obj)
  //     console.log('parsed obj-> ', JSON.parse(obj))
  //     cb(JSON.parse(obj))
  //   })
  // }
  // static getGroupDetailList (cb) {
  //   redisClient.lrange('groupDetailList', 0, -1, (err, list) => {
  //     if(err) throw new Error(err)
  //     cb(list)
  //   })
  // }
  static saveUserDetailList (obj) {
    console.log('<roomdb.js saveUserDetailList> obj -> ', obj)
    let groupName = obj.groupName
    let users = obj.users
    let admin = obj.admin
    if (users.indexOf(admin) === -1) users.push(admin)
    for (let user of users) {
      redisClient.rpush(user.concat(_groupExtn), groupName)
    }
  }
  static getUserDetailList (userName, cb) {
    redisClient.lrange(userName.concat(_groupExtn), 0, -1, (err, list) => {
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
      redisClient.rpush(msg.groupName.concat(_messages), JSON.stringify(messageSenderObj), (err, reply) => {
        if (err) throw new Error(err)
        console.log('total message count in ', msg.groupName, ' ', reply)
        cb(reply)
      })
    })
  }
  static getGroupMessages (groupName, cb) {
    console.log('<roomdb.js getGroupMessages > groupName -> ', groupName)
    redisClient.lrange(groupName.concat(_messages), 0, -1, (err, messagesList) => {
      if (err) throw new Error(err)
      console.log('<roomdb.js getGroupMessages > messagesList = ', messagesList)
      console.log('<roomdb.js getGroupMessages > messages = ', messagesList)
      cb(messagesList)
    })
  }
}

module.exports.Rooms = Rooms
