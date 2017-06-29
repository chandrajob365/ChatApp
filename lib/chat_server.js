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
      updateUserListInCreateGroup(name)
    }
    console.log('<chat_server.js createSocketDetailArrObj > socketDetails --> ', socketDetails)
  }

  const updateUserListInCreateGroup = name => {
    console.log('<chat_server.js updateUserListInCreateGroup > Entry = ', name)
    for (let socketDetail of socketDetails) {
      console.log('<chat_server.js updateUserListInCreateGroup > socketDetail.socket = ', socketDetail.socket)
      socketDetail.socket.emit('updateUserList', name)
    }
  }
  const paintView = socket => {
    console.log('<chat_server.js, paintView > Entry')
    let userName = getUserName(socket)
    console.log('<chat_server.js, paintView > Entry userName = ', userName)
    RoomDB.getUserDetailList(userName, (groupObjList) => {
      if (!groupObjList || groupObjList.length === 0) {
        socket.emit('disableMessageSenderBoxAndSendButton')
      } else {
        console.log('<chat_server.js, paintView > groupObjList = ', groupObjList)
        socket.join(groupObjList[0].groupId)
        setDefaultGroupId(socket, groupObjList[0].groupName, groupObjList[0].groupId)
        populateGroup(socket, userName, groupObjList)
        populateMessageList(socket, groupObjList[0])
      }
    })
  }

  const setDefaultGroupId = (socket, groupName, groupId) => {
    console.log('<chat_server.js setDefaultGroupId > groupId = ', groupId, ' groupName = ', groupName)
    socket.emit('setDefaultGroupId', groupName, groupId)
  }
  const populateGroup = (socket, userName, groupObjList) => {
    for (let groupObj of groupObjList) {
      console.log('<chat_server.js populateGroup > groupName = ', groupObj.groupName)
      socket.emit('createGroup', {
        groupName: groupObj.groupName,
        groupId: groupObj.groupId
      })
    }
  }
  const populateMessageList = (socket, groupObj) => {
    RoomDB.getGroupMessages(groupObj.groupId, (messageList) => {
      console.log('<chat_server.js populateMessageList > getGroupMessages callback messageList = ', messageList)
      if (messageList.length > 0) {
        for (let messagesListObj of messageList) {
          let parsedMessageObj = JSON.parse(messagesListObj)
          console.log('messagesListObj = ', messagesListObj)
          console.log('parsedMessageObj = ', parsedMessageObj)
          socket.emit('chatMessage', {
            groupName: groupObj.groupName,
            sender: parsedMessageObj.sender,
            text: parsedMessageObj.text,
            groupId: groupObj.groupId
          })
        }
      } else {
        console.log('Inside else of populateMessageList groupObj -> ', groupObj)
        socket.emit('populateGroupWithEmptyMessageList', {
          groupName: groupObj.groupName,
          groupId: groupObj.groupId
        })
      }
    })
  }
  const joinRoomByActiveSocketForUserName = (name, groupDetails) => {
    for (let socketObj of getActiveSockets(name)) {
      console.log('<chat_server.js joinRoomByActiveSocketForUserName > name--> ', name, ' socketObj.id -> ', socketObj.id, ' groupId = ', groupDetails.groupId)
      socketObj.join(groupDetails.groupId)
      console.log('<chat_server.js joinRoomByActiveSocketForUserName > socketObj.rooms = ', socketObj.rooms)
    }
  }
  const joinNewRoomByActiveSocketsInGroup = (admin, groupDetails) => {
    console.log('<chat_server.js joinNewRoomByActiveSocketsInGroup> groupDetails -> ', groupDetails)
    groupDetails.users.forEach(userName => {
      console.log('<chat_server.js joinNewRoomByActiveSocketsInGroup> Inside forEach userName -> ', userName)
      joinRoomByActiveSocketForUserName(userName, groupDetails)
    })
  }

  const createGroup = socket => {
    socket.on('createGroup', groupDetails => {
      let admin = socket.handshake.session.user.userName
      console.log('<chat_server.js createGroup> groupDetails -> ', groupDetails)
      chkAdminInUserList(admin, groupDetails)
      // joinNewRoomByActiveSocketsInGroup(admin, groupDetails)
      RoomDB.saveGroupDetail({
        groupName: groupDetails.groupName,
        admin: admin,
        users: groupDetails.users}, groupId => {
        console.log('Inside callback of createGroupDetailList ')
        groupDetails.groupId = groupId
        joinNewRoomByActiveSocketsInGroup(admin, groupDetails)
        console.log('<chat_server.js createGroup> After  joinNewRoomByActiveSocketsInGroup ')
        io.in(groupDetails.groupId).emit('createGroup', {
          groupName: groupDetails.groupName,
          groupId: groupId
        })
      })
    })
  }

  const chkAdminInUserList = (admin, groupDetails) => {
    if(groupDetails.users.indexOf(admin) === -1) {
      groupDetails.users.push(admin)
    }
  }
  const relayMessage = socket => {
    let sender = getUserName(socket)
    console.log('<chat_server.js relayMessage > sender = ', sender)
    socket.on('chatMessage', (msg) => {
      RoomDB.saveGroupMessage(msg, sender, function (groupName) {
        if (groupName.length > 0) {
          console.log('<chat_server.js relayMessage > Inside if groupName = ', groupName)
          console.log('<chat_server.js relayMessage > socket.rooms = ', socket.rooms)
          io.in(msg.groupId).emit('chatMessage', {
            groupId: msg.groupId,
            groupName: groupName,
            sender: sender,
            text: msg.text
          })
        }
      })
    })
  }

  const switchGroup = socket => {
    socket.on('switchGroup', (groupObj) => {
      socket.join(groupObj.groupId)
      console.log('<chat_server.js> Inside switchGroup socket.rooms = ', socket.rooms)
      console.log('<chat_server.js> Inside switchGroup groupObj.name -> ', groupObj.groupName, ' groupObj.groupId = ', groupObj.groupId)
      populateMessageList(socket, {
        groupName: groupObj.groupName,
        groupId: groupObj.groupId})
    })
  }
  const getGroupDetail = socket => {
    socket.on('getGroupDetail', groupObj => {
      let groupInfoObj = {}
      console.log('<chat_server.js getGroupDetail> Entry groupObj.groupName -> ', groupObj.groupName)
      RoomDB.getGroupDetailList(groupObj.groupId, (userList) => {
        groupInfoObj.userList = userList
        console.log('<chat_server.js getGroupDetail> getGroupDetailList Callback userList -> ', userList)
        RoomDB.getGroupAdminName(groupObj.groupId, adminName => {
          console.log('<chat_server.js getGroupDetail> getGroupAdminName callback adminName -> ', adminName)
          setIsAdminProperty(groupInfoObj, adminName, socket)

          console.log('<chat_server.js getGroupDetail -> > adminName = ', adminName)
          groupInfoObj.adminName = adminName
          console.log('<chat_server.js getGroupDetail > groupInfoObj -> ', groupInfoObj)
          socket.emit('populateGroupInfo', groupInfoObj)
        })
      })
    })
  }
  const setIsAdminProperty = (groupInfoObj, adminName, socket) => {
    if (adminName === socket.handshake.session.user.userName) {
      groupInfoObj.isAdmin = true
    } else {
      groupInfoObj.isAdmin = false
    }
  }
  const getNonMemberNames = socket => {
    socket.on('getNonMemberNames', groupId => {
      console.log('<chat_server.js getNonMemberNames> groupId = ', groupId)
      UserDB.allUserNames((err, userNamesList) => {
        if(err) throw new Error(err)
        console.log('<chat_server.js getNonMemberNames > userNamesList from DB = ', userNamesList)
        RoomDB.getGroupDetailList(groupId, memberList => {
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
            RoomDB.getGroupName(groupMembersObj.groupId, groupName => {
              groupMembersObj.groupName = groupName
              joinRoomByActiveSocketForUserName(newUser, groupMembersObj)
              populateGroupInActiveSocketsOfNewUsers(newUser, groupMembersObj)
              getGroupNameForNewUser(newUser, (groupName) => { // Update groupName if this user has just one group for which he was added through this function
                updateCurrentGroup(newUser, groupMembersObj)
              })
            })
          }
          RoomDB.getGroupName(groupMembersObj.groupId, groupName => {
            groupMembersObj.groupName = groupName
            updateGroupInfoInOlderMembers(groupMembersObj, socket)
          })
        })
      })
    })
  }
  const populateGroupInActiveSocketsOfNewUsers = (userName, groupMembersObj) => {
    console.log('<chat_server.js populateGroupInActiveSocketsOfNewUsers> Entry userName = ', userName, ' groupMembersObj.groupName = ', groupMembersObj.groupName)
    for (let socketObj of getActiveSockets(userName)) {
      console.log('<chat_server.js populateGroupInActiveSocketsOfNewUsers> socketObj.id = ', socketObj.id)
      socketObj.emit('createGroup', {
        groupName: groupMembersObj.groupName,
        groupId: groupMembersObj.groupId
      })
    }
  }
  const updateGroupInfoInOlderMembers = (groupInfoObj, socket) => {
    console.log('<chat_server.js updateGroupInfoInOlderMembers> groupInfoObj = ', groupInfoObj)
    RoomDB.getGroupDetailList(groupInfoObj.groupId, members => {
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
      isAdmin: groupInfoObj.isAdmin,
      groupId: groupInfoObj.groupId
    })
  }
  const getGroupNameForNewUser = (newUser, cb) => {
    RoomDB.getUserDetailList(newUser, (groupObjList) => {
      if (groupObjList.length === 1) {
        console.log('<chat_server.js getGroupNameForNewUser> groupObjList = ', groupObjList)
        cb(groupObjList[0].groupName)
      }
      //RoomDB.getGroupName(groupIdList[0], groupName => {
      //})
    })
  }
  const updateCurrentGroup = (newUser, groupMembersObj) => {
    console.log('<chat_server.js updateCurrentGroup > groupName = ', groupMembersObj.groupName, ' newUser = ', newUser)
    let activeSocketList = getActiveSockets(newUser)
    if (activeSocketList.length > 0) {
      for(let socketObj of activeSocketList) {
        socketObj.emit('setCurrentRoom', groupMembersObj.groupId)
        socketObj.emit('populateCurrentGroupName', groupMembersObj.groupName)
      }
    }
  }
  const removeMemberFromGroup = socket => {
    socket.on('removeMemberFromGroup', userGroupObj => {
      console.log('<chat_server.js removeMemberFromGroup> Entry userGroupObj = ', userGroupObj)
      removeGroupContentFromUserView(userGroupObj, socket)
      deleteUserAndGroupFromDB(userGroupObj, () => {
        RoomDB.getGroupDetailList(userGroupObj.groupId, (userList) => {
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
    RoomDB.deleteUserFromGroup(userGroupObj.userName, userGroupObj.groupId, reply => {
      console.log('<chat_server.js removeMemberFromGroup> deleteUserFromGroup Callback reply = ', reply)
      RoomDB.deleteGroupFromUserList(userGroupObj.userName, userGroupObj.groupId, reply => {
        console.log('<chat_server.js removeMemberFromGroup> deleteUserFromGroup Callback reply = ', reply)
        if(typeof (cb) === typeof (Function)) cb()
      })
    })
  }
  const getUsersActiveSockets = (userList, userGroupObj) => {
    console.log('<chat_server.js removeMemberFromGroup> Entry userList = ', userGroupObj)
    userList.filter(userName => {
      let userActiveSocketList = getActiveSockets(userName)
      if(userActiveSocketList.length > 0) {
        for (let socketObj of userActiveSocketList) {
          console.log('<chat_server.js removeMemberFromGroup> userGroupObj = ', userGroupObj)
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
