const socketio = require('socket.io')
const sharedsession = require('express-socket.io-session')
var io
const socketDetails = []
exports.listen = function (server, session) {
  io = socketio.listen(server)
  io.use(sharedsession(session))
  io.sockets.on('connection', function (socket) {
    if (socket.handshake.session.user) {
      createUserName(socket)
      relayMessage(socket)
      disconnectUser(socket)
    }
  })

  const relayMessage = socket => {
    socket.on('chatMessage', (msg) => {
      console.log('user = ', getUserName(socket), ' text = ', msg)
      io.emit('chatMessage', {
        user: getUserName(socket),
        text: msg
      })
    })
  }
  const createUserName = socket => {
    let name = socket.handshake.session.user.userName
    if (getSocketByUserName(name) === -1) {
      socketDetails.push({
        id: socket.id,
        userName: socket.handshake.session.user.userName
      })
    }
  }
  const disconnectUser = socket => {
    socket.on('disconnect', () => {
      console.log('a user', socket.id, 'is disconnected')
      socket.broadcast.emit('chatMessage', {
        user: getUserName(socket),
        text: 'disconnected'
      })
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
}
