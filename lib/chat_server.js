const socketio = require('socket.io')
const sharedsession = require('express-socket.io-session')
var io
const socketDetails = []
exports.listen = function (server, session) {
  io = socketio.listen(server)
  io.use(sharedsession(session))
  io.sockets.on('connection', function (socket) {
    console.log('socket ', socket.id, ' is connected')
    if (socket.handshake.session.user) {
      createUserName(socket)
      showActiveUsers(socket)
      console.log('socketDetails -> ', socketDetails)
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
  const showActiveUsers = socket => {
    socket.on('activeUsers', () => {
      console.log('listOfActiveUsers -> ', listOfActiveUsers())
      io.emit('activeUsers', listOfActiveUsers())
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
}
