const socketio = require('socket.io')
const sharedsession = require('express-socket.io-session')
const RoomDB = require('../db/roomdb').Rooms
var io
const socketDetails = []
// const roomsUsersMessagesList = {}
exports.listen = function (server, session) {
  io = socketio.listen(server)
  io.use(sharedsession(session))
  io.sockets.on('connection', function (socket) {
    if (socket.handshake.session.user) {
      console.log('<chat.js connection > Entry')
      createSocketDetailArrObj(socket)
      paintView(socket)
      // createDefaultRoom(socket, 'Default Room')
      // joinNewRoom(socket)
      relayMessage(socket)
      disconnectUser(socket)
      createGroup(socket)
      switchGroup(socket)
      getGroupDetail(socket)
    }
  })

  /* creates array of Objects with {username and socket id pair} */
  const createSocketDetailArrObj = socket => {
    console.log('<chat_server.js createSocketDetailArrObj Entry>')
    let name = socket.handshake.session.user.userName
    if (getSocketObjByUserName(name) === -1 || getSocketObjBySocketID(socket.id) === -1) {
      socketDetails.push({
        socket: socket, // Added to get socket to joinrooms
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
        // socket.emit('enableMessageSenderBoxAndSendButton')
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
      console.log('name--> ', name, ' socketObj.id -> ', socketObj.id)
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
  // const createGroup = socket => {
  //   socket.on('createGroup', (groupDetails) => {
  //     // setDefaultRoom(socket, groupDetails.groupName)
  //     let admin = socket.handshake.session.user.userName
  //     console.log('<chat_server.js createGroup> groupDetails -> ', groupDetails)
  //     joinNewRoomByActiveSocketsInGroup(admin, groupDetails)
  //
  //     RoomDB.saveGroupDetailList({
  //       groupName: groupDetails.groupName,
  //       admin: admin,
  //       users: groupDetails.users}, function (reply) {
  //       console.log('Inside callback of createGroupDetailList reply = ', reply)
  //       if (reply) {
  //         RoomDB.getGroupDetailObj((reply - 1), (obj) => {
  //           if (obj) {
  //             io.in(groupDetails.groupName).emit('createGroup', obj)
  //           } else {
  //             throw new Error('obj is undefined <chat_server.js, callback from getGroupDetailObj >')
  //           }
  //         })
  //       }
  //     })
  //   })
  // }

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
      RoomDB.getGroupDetailList(groupDetaillist => {
        if (groupDetaillist.length > 0) {
          for (let groupDetailObj of groupDetaillist) {
            if (JSON.parse(groupDetailObj).groupName === groupName) {
              console.log('groupDetailObj --> ', groupDetailObj)
            }
          }
        }
      })
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
