const redis = require('redis')
const redisClient = redis.createClient()
const _groupExtn = '_grp'
const _userExtn = '_users'
const _messages = '_msgs'
const _groupAdminSet = 'groupAdminSet'
const _groupIdSet = 'groupIdSet'
const _keyGen = 'keyGen'
redisClient.on('connect', function () {
  console.log('connected')
})
redisClient.on('error', function (err) {
  throw new Error(err)
})
class Rooms {
  static saveGroupDetail (obj, cb) {
    Rooms.createUniqueGroupId(obj, (groupId) => {
      Rooms.saveUserDetailList(obj, groupId)
      Rooms.saveGroupAdminSet(obj, groupId)
      Rooms.saveGroupUserList(obj)
      if (typeof (cb) === typeof (Function)) cb(groupId)
    })
  }
  static createUniqueGroupId (obj, cb) {
    redisClient.get(_keyGen, (err, val) => {
      if (err) throw new Error(err)
      if (val) Rooms.getKeyGen(_keyGen, obj, cb)
      else {
        redisClient.set(_keyGen, 0, (err, reply) => {
          if (err) throw new Error(err)
          if (reply === 'OK') Rooms.getKeyGen(_keyGen, obj, cb)
        })
      }
    })
  }

  static getKeyGen (_keyGen, obj, cb) {
    redisClient.get(_keyGen, (err, val) => {
      if (err) throw new Error(err)
      if (val) {
        redisClient.INCR(_keyGen)
        redisClient.get(_keyGen, (err, incrementedVal) => {
          if (err) throw new Error(err)
          redisClient.hmset(_groupIdSet, incrementedVal, obj.groupName)
          obj.groupId = incrementedVal
          cb(incrementedVal)
        })
      }
    })
  }
  static getGroupName (groupId, cb) {
    redisClient.hmget(_groupIdSet, groupId, (err, groupName) => {
      if (err) throw new Error(err)
      cb(groupName[0])
    })
  }
  static saveGroupAdminSet (obj, groupId, cb) {
    redisClient.hmset(_groupAdminSet, groupId, obj.admin, (err, reply) => {
      if (err) throw new Error(err)
      if (typeof (cb) === typeof (Function)) cb()
    })
  }
  static delGroupAdminSet (groupObj, cb) {
    redisClient.HDEL(_groupAdminSet, groupObj.groupId, (err, reply) => {
      if (err) throw new Error(err)
      if (typeof (cb) === typeof (Function))cb()
    })
  }
  static saveGroupUserList (obj, cb) {
    obj.users.forEach(user => {
      redisClient.rpush(obj.groupId.concat(_userExtn), user)
    })
    if (typeof (cb) === typeof (Function)) cb()
  }

  static getGroupDetailList (groupId, cb) {
    redisClient.lrange(groupId.concat(_userExtn), 0, -1, (err, userList) => {
      if (err) throw new Error(err)
      cb(userList)
    })
  }
  static getGroupAdminName (groupId, cb) {
    redisClient.hmget(_groupAdminSet, groupId, (err, adminName) => {
      if (err) throw new Error(err)
      cb(adminName[0])
    })
  }
  static deleteUserFromGroup (userName, groupId, cb) {
    redisClient.lrem(groupId.concat(_userExtn), 0, userName, (err, reply) => {
      if (err) throw new Error(err)
      cb(reply)
    })
  }
  static saveUserDetailList (obj, cb) {
    // let groupName = obj.groupName
    let users = obj.users
    for (let user of users) {
      redisClient.rpush(user.concat(_groupExtn), obj.groupId)
    }
    if (typeof (cb) === typeof (Function)) cb()
  }
  static getUserDetailList (userName, cb) {
    redisClient.lrange(userName.concat(_groupExtn), 0, -1, (err, idList) => {
      if (err) throw new Error(err)
      if (idList.length > 0) Rooms.getGroupNames(idList, cb)
      else {
        cb(idList)
      }
    })
  }
  static getGroupNames (idList, cb) {
    let groupObjList = []
    for (let groupId of idList) {
      redisClient.hmget(_groupIdSet, groupId, (err, groupName) => {
        if (err) throw new Error(err)
        groupObjList.push({
          groupName: groupName[0],
          groupId: groupId
        })
        if (idList.length === groupObjList.length) cb(groupObjList)
      })
    }
  }
  static deleteGroupFromUserList (userName, groupId, cb) {
    redisClient.lrem(userName.concat(_groupExtn), 0, groupId, (err, reply) => {
      if (err) throw new Error(err)
      cb(reply)
    })
  }
  static saveGroupMessage (msg, sender, cb) {
    redisClient.hmset('messageSenderObj', {
      'sender': sender,
      'text': msg.text
    })
    redisClient.hgetall('messageSenderObj', (err, messageSenderObj) => {
      if (err) throw new Error(err)
      redisClient.rpush(msg.groupId.concat(_messages), JSON.stringify(messageSenderObj), (err, reply) => {
        if (err) throw new Error(err)
        Rooms.getGroupName(msg.groupId, cb)
      })
    })
  }
  static getGroupMessages (groupId, cb) {
    redisClient.lrange(groupId.concat(_messages), 0, -1, (err, messagesList) => {
      if (err) throw new Error(err)
      cb(messagesList)
    })
  }
}

module.exports.Rooms = Rooms
