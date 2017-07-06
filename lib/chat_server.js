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
      createSocketDetailArrObj(socket)
      paintView(socket)
      fetchMessageFromDB(socket)
      chkServerForExtraGroupMsgs(socket)
      relayMessage(socket)
      disconnectUser(socket)
      createGroup(socket)
      switchGroup(socket)
      getGroupDetail(socket)
      getNonMemberNames(socket)
      addNewMemberToGroup(socket)
      removeMemberFromGroup(socket)
      exitGroup(socket)
    }
  })

  /* creates array of Objects with {username and socket id pair} */
  const createSocketDetailArrObj = socket => {
    let name = socket.handshake.session.user.userName
    if (getSocketObjByUserName(name) === -1 || getSocketObjBySocketID(socket.id) === -1) {
      socketDetails.push({
        socket: socket, // Added to get Active socket for joining rooms
        id: socket.id,
        userName: socket.handshake.session.user.userName
      })
      updateUserListInCreateGroup(name)
    }
  }

  const updateUserListInCreateGroup = name => {
    for (let socketDetail of socketDetails)
      socketDetail.socket.emit('updateUserList', name)
  }
  const paintView = socket => {
    let userName = getUserName(socket)
    RoomDB.getUserDetailList(userName, (groupObjList) => {
      if (!groupObjList || groupObjList.length === 0) socket.emit('disableMessageSenderBoxAndSendButton')
      else {
        socket.join(groupObjList[0].groupId)
        setDefaultGroupId(socket, groupObjList[0].groupName, groupObjList[0].groupId)
        populateGroup(socket, userName, groupObjList)
        populateFromLocalStorage(socket, groupObjList[0])
      }
    })
  }

  const setDefaultGroupId = (socket, groupName, groupId) => {
    socket.emit('setDefaultGroupId', groupName, groupId)
  }
  const populateGroup = (socket, userName, groupObjList) => {
    for (let groupObj of groupObjList) {
      socket.emit('createGroup', {
        groupName: groupObj.groupName,
        groupId: groupObj.groupId
      })
    }
  }
  const populateFromLocalStorage = (socket, groupObj) => {
    socket.emit('chkAndFetchLocalStorage', groupObj)
  }
  const fetchMessageFromDB = socket => {
    socket.on('fetchMessageFromDB', groupObj => {
      populateMessageList(socket, groupObj)
    })
  }
  const populateMessageList = (socket, groupObj) => {
    // populateFromLocalStorage(socket, groupObj)
    RoomDB.getGroupMessages(groupObj.groupId, (messageList) => {
      if (messageList.length > 0)
        emitMessageList(socket, groupObj, messageList)
      else
        socket.emit('populateGroupWithEmptyMessageList', groupObj)
    })
  }
  const emitMessageList = (socket, groupObj, messageList) => {
    socket.emit('messageList', {
      groupName: groupObj.groupName,
      messageList: messageList,
      groupId: groupObj.groupId
    })
  }
  const chkServerForExtraGroupMsgs = socket => {
    socket.on('chkServerForExtraGroupMsgs', groupObj => {
      RoomDB.getGroupExtraMessages(groupObj, messageList => {
        console.log('<chat_server.js chkServerForExtraGroupMsgs> messageList = ', messageList)
        if (messageList.length > 0)
          emitMessageList(socket, groupObj.groupObj, messageList)
      })
    })
  }
  const joinRoomByActiveSocketForUserName = (name, groupDetails) => {
    for (let socketObj of getActiveSockets(name))
      socketObj.join(groupDetails.groupId)
  }
  const joinNewRoomByActiveSocketsInGroup = (admin, groupDetails) => {
    groupDetails.users.forEach(userName => {
      joinRoomByActiveSocketForUserName(userName, groupDetails)
    })
  }

  const createGroup = socket => {
    socket.on('createGroup', groupDetails => {
      let admin = socket.handshake.session.user.userName
      chkAdminInUserList(admin, groupDetails)
      RoomDB.saveGroupDetail({
        groupName: groupDetails.groupName,
        admin: admin,
        users: groupDetails.users
      }, groupId => {
        groupDetails.groupId = groupId
        joinNewRoomByActiveSocketsInGroup(admin, groupDetails)
        io.in(groupDetails.groupId).emit('createGroup', {
          groupName: groupDetails.groupName,
          groupId: groupId
        })
      })
    })
  }

  const chkAdminInUserList = (admin, groupDetails) => {
    if (groupDetails.users.indexOf(admin) === -1) {
      groupDetails.users.push(admin)
    }
  }
  const relayMessage = socket => {
    let sender = getUserName(socket)
    socket.on('chatMessage', (msg) => {
      RoomDB.saveGroupMessage(msg, sender, function (groupName) {
        if (groupName.length > 0) {
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
      populateFromLocalStorage(socket, groupObj)
    })
  }
  const getGroupDetail = socket => {
    socket.on('getGroupDetail', groupObj => {
      let groupInfoObj = {}
      RoomDB.getGroupDetailList(groupObj.groupId, (userList) => {
        groupInfoObj.userList = userList
        RoomDB.getGroupAdminName(groupObj.groupId, adminName => {
          setIsAdminProperty(groupInfoObj, adminName, socket)
          groupInfoObj.adminName = adminName
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
      UserDB.allUserNames((err, userNamesList) => {
        if (err) throw new Error(err)
        RoomDB.getGroupDetailList(groupId, memberList => {
          let nonMemberUserList = userNamesList.filter((user) => {
            return (memberList.indexOf(user.userName) === -1)
          })
          socket.emit('populateNonMemberList', nonMemberUserList)
        })
      })
    })
  }
  const addNewMemberToGroup = socket => {
    socket.on('addNewMembersToGroup', (groupMembersObj) => {
      RoomDB.saveUserDetailList(groupMembersObj, () => {
        RoomDB.saveGroupUserList(groupMembersObj, () => {
          for (let newUser of groupMembersObj.users) {
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
    for (let socketObj of getActiveSockets(userName)) {
      socketObj.emit('createGroup', {
        groupName: groupMembersObj.groupName,
        groupId: groupMembersObj.groupId
      })
    }
  }
  const updateGroupInfoInOlderMembers = (groupInfoObj, socket) => {
    RoomDB.getGroupDetailList(groupInfoObj.groupId, members => {
      let olderMembers = members.filter(member => {
        return groupInfoObj.users.indexOf(member) === -1
      })
      helper_updateGroupInfoInOlderMembers(olderMembers, groupInfoObj, socket)
    })
  }
  const helper_updateGroupInfoInOlderMembers = (olderMembers, groupInfoObj, socket) => {
    for (let olderMember of olderMembers) {
      getMemberActiveSocketObjAndEmitUpdateEvent(olderMember, groupInfoObj, socket)
    }
  }
  const getMemberActiveSocketObjAndEmitUpdateEvent = (olderMember, groupInfoObj, socket) => {
    for (let socketObj of getActiveSockets(olderMember)) {
      if (olderMember === socket.handshake.session.user.userName) {
        groupInfoObj.isAdmin = true
      } else {
        groupInfoObj.isAdmin = false
      }
      emitUpdateGroupInfoListwithNewUsersEvent(groupInfoObj, socketObj)
    }
  }
  const emitUpdateGroupInfoListwithNewUsersEvent = (groupInfoObj, socketObj) => {
    socketObj.emit('updateGroupInfoListwithNewUsers', {
      userList: groupInfoObj.users,
      groupName: groupInfoObj.groupName,
      isAdmin: groupInfoObj.isAdmin,
      groupId: groupInfoObj.groupId
    })
  }
  const getGroupNameForNewUser = (newUser, cb) => {
    RoomDB.getUserDetailList(newUser, (groupObjList) => {
      if (groupObjList.length === 1)
        cb(groupObjList[0].groupName)
    })
  }
  const updateCurrentGroup = (newUser, groupMembersObj) => {
    let activeSocketList = getActiveSockets(newUser)
    if (activeSocketList.length > 0) {
      for (let socketObj of activeSocketList) {
        socketObj.emit('setCurrentRoom', groupMembersObj.groupId)
        socketObj.emit('populateCurrentGroupName', groupMembersObj.groupName)
      }
    }
  }
  const removeMemberFromGroup = socket => {
    socket.on('removeMemberFromGroup', userGroupObj => {
      removeGroupContentFromUserView(userGroupObj, socket)
      deleteUserAndGroupFromDB(userGroupObj, () => {
        RoomDB.getGroupDetailList(userGroupObj.groupId, (userList) => {
          removeMemberFromAllGroups(userList, userGroupObj)
        })
      })
    })
  }
  const removeGroupContentFromUserView = (userGroupObj, socket) => {
    if (getActiveSockets(userGroupObj.userName).length > 0) {
      for (let socketObj of getActiveSockets(userGroupObj.userName))
        socketObj.emit('removeGroupContentFromUserView', userGroupObj)
    }
  }
  const deleteUserAndGroupFromDB = (userGroupObj, cb) => {
    RoomDB.deleteUserFromGroup(userGroupObj.userName, userGroupObj.groupId, reply => {
      RoomDB.deleteGroupFromUserList(userGroupObj.userName, userGroupObj.groupId, reply => {
        if (typeof (cb) === typeof (Function)) cb()
      })
    })
  }
  const removeMemberFromAllGroups = (userList, userGroupObj) => {
    userList.filter(userName => {
      let userActiveSocketList = getActiveSockets(userName)
      if (userActiveSocketList.length > 0) {
        for (let socketObj of userActiveSocketList)
          socketObj.emit('removeMemberDetailFromGroupInfoPannel', userGroupObj)
      }
    })
  }
  /* Exit Group function start */
  const exitGroup = (socket) => {
    socket.on('exitGroup', (groupObj) => {
      groupObj.userName = socket.handshake.session.user.userName
      deleteUserAndGroupFromDB(groupObj, () => {
        RoomDB.getGroupAdminName(groupObj.groupId, adminName => {
          if (adminName === groupObj.userName)
            updateAdminFlow(groupObj, socket)
          else
            updateNormalUserFlow(groupObj, socket)
        })
      })
    })
  }
  const updateAdminFlow = (groupObj, socket) => {
    RoomDB.getGroupDetailList(groupObj.groupId, userList => {
      if (userList.length === 0) {
        removeGroupContentFromUserView(groupObj, socket)
        RoomDB.delGroupAdminSet(groupObj, () => {
          console.log('<chat_server.js updateAdminFlow> delGroupAdminSet callback Empty userList = ', userList)
        })
      } else {
        groupObj.admin = userList[0]
        RoomDB.saveGroupAdminSet(groupObj, groupObj.groupId, () => {
          removeGroupContentFromUserView(groupObj, socket)
          updateRemainingMemberOfGroup(groupObj, socket, userList)
        })
      }
    })
  }
  const updateRemainingMemberOfGroup = (groupObj, socket, userList) => {
    userList.forEach(userName => {
      let userActiveSocketList = getActiveSockets(userName)
      if (userActiveSocketList.length > 0) {
        let groupInfoObj = {
          userList: userList,
          adminName: groupObj.admin,
          isAdmin: false,
          groupId: groupObj.groupId
        }
        if (userName === groupObj.admin) groupInfoObj.isAdmin = true
        for (let socketObj of userActiveSocketList) {
          socketObj.emit('repaintGroupInfo', groupInfoObj)
        }
      }
    })
    // })
  }

  const updateNormalUserFlow = (groupObj, socket) => {
    removeGroupContentFromUserView(groupObj, socket)
    RoomDB.getGroupDetailList(groupObj.groupId, userList => {
      removeMemberFromAllGroups(userList, groupObj)
    })
    // socket.leave(groupObj.groupId)
  }
  /* Exit Group function end */
  const disconnectUser = socket => {
    socket.on('disconnect', () => {
      let userName = getUserName(socket)
      let msgText = userName + ' with socket id : ' + socket.id + ': is disconnected'
      console.log(msgText)
      dropUser(socket)
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
