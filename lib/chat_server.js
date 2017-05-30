const socketio = require('socket.io')
const sharedsession = require('express-socket.io-session')
var io
const socketDetails = []
const roomsUsersMessagesList = {}
exports.listen = function (server, session) {
  io = socketio.listen(server)
  io.use(sharedsession(session))
  io.sockets.on('connection', function (socket) {
    console.log('socket ', socket.id, ' is connected')
    if (socket.handshake.session.user) {
      createUserName(socket)
      createDefaultRoom(socket, 'Default Room')
      joinNewRoom(socket)
      console.log('socketDetails -> ', socketDetails)
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
    console.log('<chat_server.js , createDefaultRoom> room->', room)
    let msgText = getUserName(socket) + ': joined '.concat(room)
    createRoomsObj(room, getUserName(socket), msgText)
    console.log('< chat_server.js, createDefaultRoom >roomsUsersMessagesList->', roomsUsersMessagesList)
     /* sending to all clients in 'room', including sender */
    io.in(room).emit('chatMessage', {
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
    console.log('<chat_server.js joinNewRoom>')
    socket.on('joinRoom', (msg) => {
      console.log('msg.room->', msg.room)
      socket.join(msg.room)
      let msgText = getUserName(socket) + ': joined '.concat(msg.room)
      createRoomsObj(msg.room, getUserName(socket), msgText)
      console.log('<chat_server.js, joinNewRoom> roomsUsersMessagesList-> ', roomsUsersMessagesList)
      socket.emit('joinRoom', {
        users: roomsUsersMessagesList[msg.room].user,
        text: msgText,
        room: msg.room
      })
      io.in(msg.room).emit('chatMessage', {
        users: roomsUsersMessagesList[msg.room].user,
        text: msgText,
        room: msg.room
      })
    })
  }
  /* Relay messages back-forth client */
  const relayMessage = socket => {
    socket.on('chatMessage', (msg) => {
      console.log('user = ', getUserName(socket), ' text = ', msg.text, ' msg.room -> ', msg.room)
      let msgText = getUserName(socket) + ': ' + msg.text
      createRoomsObj(msg.room, getUserName(socket), msgText)
       // sending to all clients in 'msg.room', including sender
      io.in(msg.room).emit('chatMessage', {
        user: roomsUsersMessagesList[msg.room].user,
        text: msgText,
        room: msg.room
      })
    })
  }

  const disconnectUser = socket => {
    socket.on('disconnect', () => {
      let userName = getUserName(socket)
      let msgText = userName + ': is disconnected'
      updateAllRoomsMessage(userName, msgText)
      console.log('a user', socket.id, ': is disconnected')
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
