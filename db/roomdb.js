const redis = require('redis')
const redisClient = redis.createClient(process.env.REDIS_URL)
const _groupExtn = '_grp_'
const _userExtn = '_users_'
const _messages = '_msgs_'
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
    Rooms.lookupOrCreateGroupId(obj, (groupId) => {
      Rooms.saveUserDetailList(obj, groupId)
      Rooms.saveGroupAdminSet(obj, groupId)
      Rooms.saveGroupUserList(obj)
      if (typeof (cb) === typeof (Function)) {
        console.log('<roomdb.js saveGroupDetail > type of cb is callback')
        cb(groupId)
      }
    })
  }
  static lookupOrCreateGroupId (obj, cb) {
    redisClient.get(_keyGen, (err, val) => {
      if(err) throw new Error(err)
      if(val)
      {
        Rooms.getKeyGen(_keyGen, obj, cb)
      } else {
        console.log('<roomdb.js lookupOrCreateGroupId> Else part')
        redisClient.set(_keyGen, 0, (err, reply) => {
          if(err) throw new Error(err)
          console.log('<roomdb.js lookupOrCreateGroupId> After setting _keyGen reply = ', reply)
          if(reply === 'OK')
          Rooms.getKeyGen(_keyGen, obj, cb)
        })
      }
    })
  }

  static getKeyGen (_keyGen, obj, cb) {
    console.log('<roomdb.js getKeyGen> Entry')
    redisClient.get(_keyGen, (err, val) => {
      if(err) throw new Error(err)
      console.log('<roomdb.js getKeyGen> keyGen val = ', val)
      if (val) {
        redisClient.INCR(_keyGen)
        // console.log('<roomdb.js getKeyGen> incrementedVal = ', incrementedVal)
        redisClient.get(_keyGen, (err, incrementedVal) => {
          if(err) throw new Error(err)
            console.log('<roomdb.js getKeyGen> incrementedVal = ', incrementedVal, ' groupName = ', obj.groupName)
            redisClient.hmset(_groupIdSet, incrementedVal, obj.groupName)
            obj.groupId = incrementedVal
            cb(incrementedVal)
          })
      }
    })
  }
  static getGroupName (groupId, cb) {
    redisClient.hmget(_groupIdSet, groupId, (err, groupName) => {
      console.log('<roomdb.js getGroupName> groupId = ', groupId, ' groupName= ', groupName)
      if(err) throw new Error(err)
      cb(groupName[0])
    })
  }
  static saveGroupAdminSet (obj, groupId, cb) {
      redisClient.hmset(_groupAdminSet, groupId, obj.admin, (err, reply) => {
        if(err) throw new Error(err)
        if (typeof (cb) === typeof (Function)) {
          console.log('<roomdb.js saveGroupAdminSet > type of cb is callback')
          cb()
        }
      })
  }
  static delGroupAdminSet (groupObj, cb) {
    console.log('<roomdb.js updateAdminSet > Entry')
    redisClient.HDEL(_groupAdminSet, groupObj.groupId, (err, reply) => {
      if(err) throw new Error(err)
      // Rooms.saveGroupAdminSet(obj, groupId)
      if (typeof (cb) === typeof (Function)) {
        console.log('<roomdb.js updateAdminSet > type of cb is callback')
        cb()
      }
    })
  }
  static saveGroupUserList (obj, cb) {
    obj.users.forEach(user => {
      redisClient.rpush(_userExtn.concat(obj.groupId), user)
    })
    if (typeof (cb) === typeof (Function)) {
      console.log('<roomdb.js saveGroupUserList > type of cb is callback')
      cb()
    }
  }

  static getGroupDetailList (groupId, cb) {
    console.log('<roomdb.js getGroupDetailList > Entry groupId = ', groupId)
    redisClient.lrange(_userExtn.concat(groupId), 0, -1, (err, userList) => {
      if(err) throw new Error(err)
      console.log('<roomdb.js getGroupDetailList > users in group = ', userList)
      cb(userList)
    })
  }
  static getGroupAdminName (groupId, cb) {
    console.log('<roomdb.js getGroupAdminName > Entry groupId = ', groupId)
    redisClient.hmget(_groupAdminSet, groupId, (err, adminName) => {
      if(err) throw new Error(err)
      console.log('<roomdb.js getGroupAdminName >result from DB adminName -> ', adminName)
      cb(adminName[0])
    })
  }
  static deleteUserFromGroup (userName, groupId, cb) {
    console.log('<roomdb.js deleteUserFromGroup > Entry userName = ', userName, ' groupId = ', groupId)
    redisClient.lrem(_userExtn.concat(groupId), 0, userName, (err, reply) => {
      if(err) throw new Error(err)
      cb(reply)
    })
  }
  static saveUserDetailList (obj, cb) {
    console.log('<roomdb.js saveUserDetailList> obj -> ', obj)
    let groupName = obj.groupName
    let users = obj.users
    // if(obj.admin && (users.indexOf(obj.admin) === -1))
    //   users.push(obj.admin)
    for (let user of users) {
      console.log('<roomdb.js saveUserDetailList> user = ', user)
      redisClient.rpush(_groupExtn.concat(user), obj.groupId)
    }
    if (typeof (cb) === typeof (Function)) {
      console.log('<roomdb.js saveUserDetailList> type of cb is callback')
      cb()
    }
  }
  static getUserDetailList (userName, cb) {
    redisClient.lrange(_groupExtn.concat(userName), 0, -1, (err, idList) => {
      console.log('<roomdb.js, getUserDetailList > GroupIdList =  ', idList)
      if (err) throw new Error(err)
      if(idList.length > 0) {
        console.log('<roomdb.js, getUserDetailList > If part GroupIdList =  ', idList)
        Rooms.getGroupNames(idList, cb)
      } else {
        console.log('<roomdb.js, getUserDetailList > Else part GroupIdList =  ', idList)
        cb(idList)
      }

    })
  }
  static getGroupNames (idList, cb) {
    let groupObjList = []
    for(let groupId of idList) {
      redisClient.hmget(_groupIdSet, groupId, (err, groupName) => {
        if(err) throw new Error(err)
        console.log('<roomdb.js getGroupNames> groupId = ', groupId, ' groupName = ', groupName)
        groupObjList.push({
          groupName: groupName[0],
          groupId: groupId
        })
        if(idList.length === groupObjList.length) {
          console.log('<roomdb.js getGroupNames> idList.length === groupObjList.length ==> ', (idList.length === groupObjList.length))
          cb(groupObjList)
        }
      })
    }
  }
  static deleteGroupFromUserList (userName, groupId, cb) {
    console.log('<roomdb.js deleteGroupFromUserList > Entry userName = ', userName, ' groupId = ', groupId)
    redisClient.lrem(_groupExtn.concat(userName), 0, groupId, (err, reply) => {
      if(err) throw new Error(err)
      cb(reply)
    })
  }
  static saveGroupMessage (msg, sender, cb) {
    // let timeStamp = new Date().toLocaleString()
    // console.log('Message Saving local Time = ', new Date().toLocaleString())
    redisClient.hmset('messageSenderObj', {
      'sender': sender,
      'text': msg.text
    })
    redisClient.hgetall('messageSenderObj', (err, messageSenderObj) => {
      if (err) throw new Error(err)
      redisClient.rpush(_messages.concat(msg.groupId), JSON.stringify(messageSenderObj), (err, reply) => {
        if (err) throw new Error(err)
        Rooms.getGroupName(msg.groupId, cb)
      })
    })
  }
  static getGroupMessages (groupId, cb) {
    console.log('<roomdb.js getGroupMessages > groupId -> ', groupId)
    redisClient.lrange(_messages.concat(groupId), 0, -1, (err, messagesList) => {
      if (err) throw new Error(err)
      console.log('<roomdb.js getGroupMessages > messagesList = ', messagesList)
      console.log('<roomdb.js getGroupMessages > messages = ', messagesList)
      cb(messagesList)
    })
  }
  static getGroupExtraMessages (groupObj, cb) {
    // let LSMessageListCount = groupObj.messageListLength - 1
    console.log('<roomdb.js getGroupExtraMessages >groupObj.messageListLength = ', groupObj.messageListLength)
    redisClient.lrange(_messages.concat(groupObj.groupObj.groupId), groupObj.messageListLength, -1, (err, messagesList) => {
      if (err) throw new Error(err)
      console.log('<roomdb.js getGroupMessages > messagesList = ', messagesList)
      console.log('<roomdb.js getGroupMessages > messages = ', messagesList)
      cb(messagesList)
    })
  }
}

module.exports.Rooms = Rooms
