const socketio = require('socket.io')
const sharedsession = require('express-socket.io-session')
var io
const socketDetails = []
const rooms = {}
const activeUsersInRoom = []
exports.listen = function (server, session) {
  io = socketio.listen(server)
  io.use(sharedsession(session))
  io.sockets.on('connection', function (socket) {
    console.log('socket ', socket.id, ' is connected')
    if (socket.handshake.session.user) {
      createUserName(socket)
      createDefaultRoom(socket, 'Default Room')
      showActiveUsers(socket)
      joinNewRoom(socket)
      console.log('socketDetails -> ', socketDetails)
      relayMessage(socket)
      disconnectUser(socket)
    }
  })

  /* creates array of Objects with {username and socket id pair} */
  const createUserName = socket => {
    let name = socket.handshake.session.user.userName
    if (getSocketByUserName(name) === -1) {
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
    io.in(room).emit('chatMessage', { // Sends to all client in room except sender
      user: getUserName(socket),
      text: 'joined '.concat(room),
      room: room
    })
  }

  /* Join new Room */
  const joinNewRoom = socket => {
    socket.on('joinRoom', (newRoom) => {
      console.log('newRoom.room->', newRoom.room)
      socket.join(newRoom.room)
      let socketKeys = io.sockets.adapter.rooms[newRoom.room].sockets
      rooms[newRoom.room] = {users: listOfActiveUsersInRoom(socketKeys)}
      console.log('<chat_server.js , joinNewRoom> rooms -> ', rooms)
      io.in(newRoom.room).emit('chatMessage', {
        user: getUserName(socket),
        text: 'joined '.concat(newRoom.room),
        room: newRoom.room,
        activeUsers: rooms[newRoom.room].users
      })
    })
  }

  /* Relay messages back-forth client */
  const relayMessage = socket => {
    socket.on('chatMessage', (msg) => {
      console.log('user = ', getUserName(socket), ' text = ', msg.msgTxt, ' msg.room -> ', msg.room)
      io.in(msg.room).emit('chatMessage', {
        user: getUserName(socket),
        text: msg.msgTxt,
        room: msg.room
      })
    })
  }


  const showActiveUsers = socket => {
    socket.on('activeUsers', () => {
      console.log('listOfActiveUsers -> ', listOfActiveUsers())
      io.emit('activeUsers', {
        onLineUsers: listOfActiveUsers()
      })
    })
  }
  const disconnectUser = socket => {
    socket.on('disconnect', () => {
      let userName = getUserName(socket)
      console.log('a user', socket.id, 'is disconnected')
      socket.broadcast.emit('chatMessage', {
        user: userName,
        text: 'disconnected'
      })
      dropUser(socket)
      socket.broadcast.emit('updateActiveUsersList', userName)
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
  const listOfActiveUsers = () => socketDetails.map(user => user.userName)
  const listOfActiveUsersInRoom = socketKeys => {
    for(let socketId in socketKeys) {
      let socketUserName = socketDetails[getSocketBySocketID(socketId)].userName
      console.log('socketId-> ', socketId, ' socketUserName-> ', socketUserName)
      if(activeUsersInRoom.indexOf(socketUserName) === -1)
      activeUsersInRoom.push(socketUserName)
    }
    return activeUsersInRoom
  }
}
