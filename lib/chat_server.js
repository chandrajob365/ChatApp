const socketio = require('socket.io')
const sharedsession = require('express-socket.io-session')
var io
const socketDetails = []
const roomsUsersMessagesList = {}
exports.listen = function (server, session) {
  io = socketio.listen(server)
  io.use(sharedsession(session))
  io.sockets.on('connection', function (socket) {
    if (socket.handshake.session.user) {
      createUserName(socket)
      createDefaultRoom(socket, 'Default Room')
      joinNewRoom(socket)
      relayMessage(socket)
      disconnectUser(socket)
    }
  })

  /* creates array of Objects with {username and socket id pair} */
  const createUserName = socket => {
    let name = socket.handshake.session.user.userName
    if (getSocketByUserName(name) === -1 || getSocketBySocketID(socket.id) === -1) {
      socketDetails.push({
        id: socket.id,
        userName: socket.handshake.session.user.userName
      })
    }
  }
  /* Creates a default room */
  const createDefaultRoom = (socket, room) => {
    socket.join(room)
    let userName = getUserName(socket)
    let msgText = userName + ': joined '.concat(room)
    createRoomsObj(room, userName, msgText)
     /* sending to all clients in 'room', including sender */
    io.in(room).emit('chatMessage', {
      senderName: userName,
      users: roomsUsersMessagesList[room].user,
      text: msgText,
      room: room
    })
  }

  const createRoomsObj = (room, userName, msgText) => {
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

  /* Join new Room */
  const joinNewRoom = socket => {
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
  }
  /* Relay messages back-forth client */
  const relayMessage = socket => {
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
  }

  const disconnectUser = socket => {
    socket.on('disconnect', () => {
      let userName = getUserName(socket)
      let msgText = userName + ': is disconnected'
      updateAllRoomsMessage(userName, msgText)
      dropUser(socket)
    })
  }
  const getUserName = socket => socketDetails[getSocketBySocketID(socket.id)].userName

  const dropUser = socket => socketDetails.splice(getSocketBySocketID(socket.id), 1)

  const getSocketBySocketID = sid => socketDetails
                                      .map(user => user.id === sid)
                                      .indexOf(true)

  const getSocketByUserName = userName => socketDetails
                                        .map(user => user.userName === userName)
                                        .indexOf(true)
  const updateAllRoomsMessage = (userName, msgText) => {
    for (let room of Object.keys(roomsUsersMessagesList)) {
      if (roomsUsersMessagesList[room].user.indexOf(userName) !== -1) {
        roomsUsersMessagesList[room].msg.push(msgText)
        emitDisconnectMsg(room, userName, msgText)
      }
    }
  }
  const emitDisconnectMsg = (room, userName, msgText) => {
    // sending to all clients in 'msg.room', excluding sender
    io.to(room).emit('chatMessage', {
      user: userName,
      text: msgText,
      room: room
    })
  }
}
