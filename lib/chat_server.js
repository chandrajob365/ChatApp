const socketio = require('socket.io')
const sharedsession = require('express-socket.io-session')
const RoomDB = require('../db/roomdb').Rooms
const UserDB = require('../db/userdb').Users
var io
const socketDetails = []
exports.listen = function (server, session) {
  io = socketio.listen(server)
  io.use(sharedsession(session))
  io.sockets.on('connection', function (socket) {
    if (socket.handshake.session.user) {
      console.log('<chat.js connection > Entry')
      createSocketDetailArrObj(socket)
      paintView(socket)
      relayMessage(socket)
      disconnectUser(socket)
      createGroup(socket)
      switchGroup(socket)
      getGroupDetail(socket)
      getNonMemberNames(socket)
      addNewMemberToGroup(socket)
      removeMemberFromGroup(socket)
    }
  })

  /* creates array of Objects with {username and socket id pair} */
  const createSocketDetailArrObj = socket => {
    console.log('<chat_server.js createSocketDetailArrObj Entry>')
    let name = socket.handshake.session.user.userName
    if (getSocketObjByUserName(name) === -1 || getSocketObjBySocketID(socket.id) === -1) {
      socketDetails.push({
        socket: socket, // Added to get Active socket for joining rooms
        id: socket.id,
        userName: socket.handshake.session.user.userName
      })
    }
    console.log('<chat_server.js createSocketDetailArrObj > socketDetails --> ', socketDetails)
  }

  const paintView = socket => {
    console.log('<chat_server.js, paintView > Entry')
    let userName = getUserName(socket)
    console.log('<chat_server.js, paintView > Entry userName = ', userName)
    RoomDB.getUserDetailList(userName, (groupList) => {
      if (!groupList || groupList.length === 0) {
        socket.emit('disableMessageSenderBoxAndSendButton')
      } else {
        console.log('<chat_server.js, paintView > groupList = ', groupList)
        socket.join(groupList[0])
        setDefaultRoom(socket, groupList[0])
        populateGroup(socket, userName, groupList)
        populateMessageList(socket, groupList[0])
      }
    })
  }

  const setDefaultRoom = (socket, groupName) => {
    console.log('<chat_server.js setDefaultRoom > groupName = ', groupName)
    socket.emit('setDefaultRoom', groupName)
  }
  const populateGroup = (socket, userName, groupList) => {
    for (let groupName of groupList) {
      console.log('<chat_server.js populateGroup > group = ', groupName)
      socket.emit('createGroup', groupName)
    }
  }
  const populateMessageList = (socket, groupName) => {
    RoomDB.getGroupMessages(groupName, (messageList) => {
      console.log('<chat_server.js populateMessageList > getGroupMessages callback messageList = ', messageList)
      if (messageList.length > 0) {
        for (let messagesListObj of messageList) {
          let parsedMessageObj = JSON.parse(messagesListObj)
          console.log('messagesListObj = ', messagesListObj)
          console.log('parsedMessageObj = ', parsedMessageObj)
          socket.emit('chatMessage', {
            groupName: groupName,
            sender: parsedMessageObj.sender,
            text: parsedMessageObj.text
          })
        }
      } else {
        console.log('Inside else of populateMessageList groupName -> ', groupName)
        socket.emit('populateGroupWithEmptyMessageList', {
          name: groupName
        })
      }
    })
  }
  const joinRoomByActiveSocketForUserName = (name, groupDetails) => {
    for (let socketObj of getActiveSockets(name)) {
      console.log('<chat_server.js joinRoomByActiveSocketForUserName > name--> ', name, ' socketObj.id -> ', socketObj.id)
      socketObj.join(groupDetails.groupName)
    }
  }
  const joinNewRoomByActiveSocketsInGroup = (admin, groupDetails) => {
    joinRoomByActiveSocketForUserName(admin, groupDetails)
    console.log('<chat_server.js joinNewRoomByActiveSocketsInGroup> groupDetails -> ', groupDetails)
    for (let userName of groupDetails.users) {
      joinRoomByActiveSocketForUserName(userName, groupDetails)
    }
  }

  const createGroup = socket => {
    socket.on('createGroup', (groupDetails) => {
      // setDefaultRoom(socket, groupDetails.groupName)
      let admin = socket.handshake.session.user.userName
      console.log('<chat_server.js createGroup> groupDetails -> ', groupDetails)
      joinNewRoomByActiveSocketsInGroup(admin, groupDetails)

      RoomDB.saveGroupDetail({
        groupName: groupDetails.groupName,
        admin: admin,
        users: groupDetails.users}, function () {
        console.log('Inside callback of createGroupDetailList ')
        io.in(groupDetails.groupName).emit('createGroup', groupDetails.groupName)
      })
    })
  }

  const relayMessage = socket => {
    let sender = getUserName(socket)
    console.log('<chat_server.js relayMessage > sender = ', sender)
    socket.on('chatMessage', (msg) => {
      RoomDB.saveGroupMessage(msg, sender, function (reply) {
        if (reply) {
          console.log('<chat_server.js relayMessage > Inside if reply = ', reply, '  msg.groupName -> ', msg.groupName)
          io.in(msg.groupName).emit('chatMessage', {
            groupName: msg.groupName,
            sender: sender,
            text: msg.text
          })
        }
      })
    })
  }

  const switchGroup = socket => {
    socket.on('switchGroup', (groupName) => {
      socket.join(groupName.name)
      console.log('<chat_server.js> Inside switchGroup groupName.name -> ', groupName.name)
      populateMessageList(socket, groupName.name)
    })
  }
  const getGroupDetail = socket => {
    socket.on('getGroupDetail', (groupName) => {
      let groupInfoObj = {}
      console.log('<chat_server.js getGroupDetail> Entry groupName -> ', groupName)
      RoomDB.getGroupDetailList(groupName, (userList) => {
        groupInfoObj.userList = userList
        console.log('<chat_server.js getGroupDetail> getGroupDetailList Callback userList -> ', userList)
        RoomDB.getGroupAdminName(groupName, (adminName) => {
          console.log('<chat_server.js getGroupDetail> getGroupAdminName callback adminName -> ', adminName)
          setIsAdminProperty(groupInfoObj, adminName, socket)

          console.log('<chat_server.js getGroupDetail -> > adminName[0] = ', adminName[0])
          groupInfoObj.adminName = adminName[0]
          console.log('<chat_server.js getGroupDetail > groupInfoObj -> ', groupInfoObj)
          socket.emit('populateGroupInfo', groupInfoObj)
        })
      })
    })
  }
  const setIsAdminProperty = (groupInfoObj, adminName, socket) => {
    if (adminName[0] === socket.handshake.session.user.userName) {
      groupInfoObj.isAdmin = true
    } else {
      groupInfoObj.isAdmin = false
    }
  }
  const getNonMemberNames = socket => {
    socket.on('getNonMemberNames', groupName => {
      console.log('<chat_server.js getNonMemberNames> groupName = ', groupName)
      UserDB.allUserNames((err, userNamesList) => {
        if(err) throw new Error(err)
        console.log('<chat_server.js getNonMemberNames > userNamesList from DB = ', userNamesList)
        RoomDB.getGroupDetailList(groupName, memberList => {
          console.log('<chat_server.js getNonMemberNames> memberList = ', memberList)
          let nonMemberUserList = userNamesList.filter((user) => {
             return (memberList.indexOf(user.userName) === -1)
          })
          console.log('<chat_server.js getNonMemberNames > nonMemberUserList = ', nonMemberUserList)
          socket.emit('populateNonMemberList', nonMemberUserList)
        })
      })
    })
  }
  const addNewMemberToGroup = socket => {
    socket.on('addNewMembersToGroup', (groupMembersObj) => {
      console.log('<chat_server.js addNewMemberToGroup > Entry groupMembersObj = ', groupMembersObj)
      RoomDB.saveUserDetailList(groupMembersObj, () => {
        console.log('<chat_server.js addNewMemberToGroup > Inside callback of saveUserDetailList Entry')
        RoomDB.saveGroupUserList(groupMembersObj, () => {
          console.log('<chat_server.js addNewMemberToGroup > Inside callback of saveGroupUserList Entry')
          for (let newUser of groupMembersObj.users) {
            console.log('<chat_server.js addNewMemberToGroup > newuser = ', newUser)
            joinRoomByActiveSocketForUserName(newUser, groupMembersObj.groupName)
            populateGroupInActiveSocketsOfNewUsers(newUser, groupMembersObj.groupName)
          }
          updateGroupInfoInOlderMembers(groupMembersObj, socket)
        })
      })
    })
  }
  const populateGroupInActiveSocketsOfNewUsers = (userName, groupName) => {
    console.log('<chat_server.js populateGroupInActiveSocketsOfNewUsers> Entry userName = ', userName, ' groupName = ', groupName)
    for (let socketObj of getActiveSockets(userName)) {
      console.log('<chat_server.js populateGroupInActiveSocketsOfNewUsers> socketObj.id = ', socketObj.id)
      socketObj.emit('createGroup', groupName)
    }
  }
  const updateGroupInfoInOlderMembers = (groupInfoObj, socket) => {
    console.log('<chat_server.js updateGroupInfoInOlderMembers> groupInfoObj = ', groupInfoObj)
    RoomDB.getGroupDetailList(groupInfoObj.groupName, members => {
      console.log('<chat_server.js updateGroupInfoInOlderMembers> getGroupDetailList callback members = ', members)
      let olderMembers = members.filter(member => {
        return groupInfoObj.users.indexOf(member) === -1
      })
      helper_updateGroupInfoInOlderMembers(olderMembers, groupInfoObj, socket)

    })
  }
  const helper_updateGroupInfoInOlderMembers = (olderMembers, groupInfoObj, socket) => {
    for(let olderMember of olderMembers) {
      console.log('<chat_server.js helper_updateGroupInfoInOlderMembers> olderMember = ', olderMember)
      getMemberActiveSocketObjAndEmitUpdateEvent(olderMember, groupInfoObj, socket)
    }
  }
  const getMemberActiveSocketObjAndEmitUpdateEvent = (olderMember, groupInfoObj, socket) => {
    console.log('<chat_server.js getMemberActiveSocketObjAndEmitUpdateEvent> Entry ')
    for (let socketObj of getActiveSockets(olderMember)) {
      if(olderMember === socket.handshake.session.user.userName) {
        groupInfoObj.isAdmin = true
      } else {
        groupInfoObj.isAdmin = false
      }
      emitUpdateGroupInfoListwithNewUsersEvent(groupInfoObj, socketObj)
    }
  }
  const emitUpdateGroupInfoListwithNewUsersEvent = (groupInfoObj, socketObj) => {
    console.log('<chat_server.js emitUpdateGroupInfoListwithNewUsersEvent> groupInfoObj = ', groupInfoObj)
    socketObj.emit('updateGroupInfoListwithNewUsers', {
      userList: groupInfoObj.users,
      groupName: groupInfoObj.groupName,
      isAdmin: groupInfoObj.isAdmin
    })
  }
  const removeMemberFromGroup = socket => {
    socket.on('removeMemberFromGroup', userGroupObj => {
      console.log('<chat_server.js removeMemberFromGroup> Entry userGroupObj = ', userGroupObj)
      removeGroupContentFromUserView(userGroupObj, socket)
      deleteUserAndGroupFromDB(userGroupObj, () => {
        RoomDB.getGroupDetailList(userGroupObj.groupName, (userList) => {
          getUsersActiveSockets(userList, userGroupObj)
        })
      })
    })
  }
  const removeGroupContentFromUserView = (userGroupObj, socket) => {
    console.log('<chat_server.js removeMemberFromGroup> Entry getActiveSockets(userGroupObj.userName) = ', getActiveSockets(userGroupObj.userName))
    if (getActiveSockets(userGroupObj.userName).length > 0) {
      for (let socketObj of getActiveSockets(userGroupObj.userName)) {
        socketObj.emit('removeGroupContentFromUserView', userGroupObj)
      }
    }
  }
  const deleteUserAndGroupFromDB = (userGroupObj, cb) => {
    RoomDB.deleteUserFromGroup(userGroupObj.userName, userGroupObj.groupName, reply => {
      console.log('<chat_server.js removeMemberFromGroup> deleteUserFromGroup Callback reply = ', reply)
      RoomDB.deleteGroupFromUserList(userGroupObj.userName, userGroupObj.groupName, reply => {
        console.log('<chat_server.js removeMemberFromGroup> deleteUserFromGroup Callback reply = ', reply)
        if(typeof (cb) === typeof (Function)) cb()
      })
    })
  }
  const getUsersActiveSockets = (userList, userGroupObj) => {
    userList.filter(userName => {
      let userActiveSocketList = getActiveSockets(userName)
      if(userActiveSocketList.length > 0) {
        for (let socketObj of userActiveSocketList) {
          socketObj.emit('removeMemberDetailFromGroupInfoPannel', userGroupObj)
        }
      }
    })
  }
  const disconnectUser = socket => {
    socket.on('disconnect', () => {
      let userName = getUserName(socket)
      let msgText = userName + ' with socket id : ' + socket.id + ': is disconnected'
      console.log(msgText)
      dropUser(socket)
      console.log('remaining sockets -> ', socketDetails)
    })
  }
  const getUserName = socketObj => socketDetails[getSocketObjBySocketID(socketObj.id)].userName

  const getActiveSockets = userName => {
    let t = socketDetails
            .filter(user => user.userName === userName)
            .map(socketObjs => socketObjs.socket)
    return t
  }

  const dropUser = socket => socketDetails.splice(getSocketObjBySocketID(socket.id), 1)

  const getSocketObjBySocketID = sid => socketDetails
    .map(user => user.id === sid)
    .indexOf(true)

  const getSocketObjByUserName = userName => socketDetails
  .map(user => user.userName === userName)
  .indexOf(true)
}
