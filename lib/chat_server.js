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
      // disconnectUser(socket)
      createGroup(socket)
    }
  })

  /* creates array of Objects with {username and socket id pair} */
  const createSocketDetailArrObj = socket => {
    let name = socket.handshake.session.user.userName
    if (getSocketObjByUserName(name) === -1 || getSocketObjBySocketID(socket.id) === -1) {
      socketDetails.push({
        //socket:socket, // Added to get socket to joinrooms
        id: socket.id,
        userName: socket.handshake.session.user.userName
      })
      console.log('getSocketObjBySocketID -> ', getSocketObjBySocketID(socket.id))
      console.log('socketDetails--> ', socketDetails)
    }
  }
  /* Creates a default room */
  // const createDefaultRoom = (socket, room) => {
  //   socket.join(room)
  //   let userName = getUserName(socket)
  //   let msgText = userName + ': joined '.concat(room)
  //   createRoomsObj(room, userName, msgText)
  //   /* sending to all clients in 'room', including sender */
  //   io.in(room).emit('chatMessage', {
  //     senderName: userName,
  //     users: roomsUsersMessagesList[room].user,
  //     text: msgText,
  //     room: room
  //   })
  // }

  const paintView = socket => {
    console.log('<chat_server.js, paintView > Entry')
    let userName = getUserName(socket)
    console.log('<chat_server.js, paintView > Entry userName = ', userName)
    RoomDB.getUserDetailList(userName, (groupList) => {
      if (!groupList || groupList.length === 0) {
        // createDefaultRoom(socket, 'defaultRoom')
        socket.emit('disableMessageSenderBoxAndSendButton')
      } else {
        console.log('<chat_server.js, paintView > groupList = ', groupList)
        socket.emit('enableMessageSenderBoxAndSendButton')
        setDefaultRoom(socket, groupList[0])
        populateGroup(socket, userName, groupList)
        populateMessageList(socket, groupList[0])
      }
    })
  }

  const setDefaultRoom = (socket, groupName) => {
    console.log('<chat_server.js setDefaultRoom > roomName = ', groupName)
    socket.emit('setDefaultRoom', groupName)
  }
  const populateGroup = (socket, userName, groupList) => {
    for (let group of groupList) {
      console.log('<chat_server.js populateGroup > group = ', group)
      socket.emit('createGroup', {
        groupName: group
      })
    }
  }
  const populateMessageList = (socket,groupName) => {
    RoomDB.getGroupMessages(groupName, (messageList) => {
      console.log('<chat_server.js populateMessageList > getGroupMessages callback messageList = ', messageList)
       if (messageList) {
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
      }
    })
  }
  const createGroup = socket => {
    socket.on('createGroup', (groupDetails) => {
      setDefaultRoom(socket, groupDetails.groupName)
      // for (let user of groupDetails.users) {
      //   let socketObj = getSocketObjByUserName(user).socket
      //   if(socketObj) socketObj.join(groupDetails.groupName)
      // }
      socket.join(groupDetails.groupName)
      console.log('<chat_server.js createGroup> groupDetails -> ', groupDetails)
      let admin = socket.handshake.session.user.userName
      RoomDB.saveGroupDetailList({
        groupName: groupDetails.groupName,
        admin: admin,
        users: groupDetails.users}, function (reply) {
        console.log('Inside callback of createGroupDetailList reply = ', reply)
        if (reply) {
          RoomDB.getGroupDetailList((reply - 1), (obj) => {
            if (obj) {
              io.in(groupDetails.groupName).emit('createGroup', obj)
            } else {
              throw new Error('obj is undefined <chat_server.js, callback from getGroupDetailList >')
            }
          })
        }
      })
    })
  }
  const relayMessage = socket => {
    let sender = getUserName(socket)
    console.log('<chat_server.js relayMessage > sender = ', sender)
    socket.on('chatMessage', (msg) => {
      RoomDB.saveGroupMessage(msg, sender, function (reply) {
        if (reply) {
          console.log('<chat_server.js relayMessage > Inside if reply = ', reply);
          socket.emit('chatMessage', {
            groupName: msg.groupName,
            sender: sender,
            text: msg.text
          })
        }
      })
    })
  }
  /* const createRoomsObj = (room, userName, msgText) => {
    if (!roomsUsersMessagesList[room]) {
      roomsUsersMessagesList[room] = {}
      roomsUsersMessagesList[room].user === undefined
        ? roomsUsersMessagesList[room].user = []
        : roomsUsersMessagesList[room].user.push(userName)
      roomsUsersMessagesList[room].msg === undefined
        ? roomsUsersMessagesList[room].msg = []
        : roomsUsersMessagesList[room].msg.push(msgText)
    }
    if (roomsUsersMessagesList[room].user.indexOf(userName) === -1) {
      roomsUsersMessagesList[room].user.push(userName)
    }
    roomsUsersMessagesList[room].msg.push(msgText)
  }
*/
  /* Join new Room */
  /* const joinNewRoom = socket => {
    socket.on('joinRoom', (msg) => {
      socket.join(msg.room)
      let msgText = getUserName(socket) + ': joined '.concat(msg.room)
      createRoomsObj(msg.room, getUserName(socket), msgText)
      socket.emit('joinRoom', {
        users: roomsUsersMessagesList[msg.room].user,
        text: msgText,
        room: msg.room
      })
      io.in(msg.room).emit('chatMessage', {
        senderName: getUserName(socket),
        users: roomsUsersMessagesList[msg.room].user,
        text: msgText,
        room: msg.room
      })
    })
  } */

  /* Relay messages back-forth client */
  /* const relayMessage = socket => {
    socket.on('chatMessage', (msg) => {
      let userName = getUserName(socket)
      let msgText = msg.text
      createRoomsObj(msg.room, userName, msgText)
      // sending to all clients in 'msg.room', including sender
      io.in(msg.room).emit('chatMessage', {
        senderName: userName,
        user: roomsUsersMessagesList[msg.room].user,
        text: msg.text,
        room: msg.room
      })
    })
  } */

   const disconnectUser = socket => {
    socket.on('disconnect', () => {
      let userName = getUserName(socket)
      let msgText = userName + ': is disconnected'
      //updateAllRoomsMessage(userName, msgText)
      dropUser(socket)
    })
  }
  const getUserName = socket => socketDetails[getSocketObjBySocketID(socket.id)].userName

  const dropUser = socket => socketDetails.splice(getSocketObjBySocketID(socket.id), 1)

  const getSocketObjBySocketID = sid => socketDetails
    .map(user => user.id === sid)
    .indexOf(true)

  const getSocketObjByUserName = userName => socketDetails
    .map(user => user.userName === userName)
    .indexOf(true)
  /* const updateAllRoomsMessage = (userName, msgText) => {
    for (let room of Object.keys(roomsUsersMessagesList)) {
      if (roomsUsersMessagesList[room].user.indexOf(userName) !== -1) {
        roomsUsersMessagesList[room].msg.push(msgText)
        emitDisconnectMsg(room, userName, msgText)
      }
    }
  } */
  /* const emitDisconnectMsg = (room, userName, msgText) => {
    // sending to all clients in 'msg.room', excluding sender
    io.to(room).emit('chatMessage', {
      user: userName,
      text: msgText,
      room: room
    })
  } */
}
