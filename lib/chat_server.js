const socketio = require('socket.io')
var io
const userDetails = []
var userCount = 0

exports.listen = function (server) {
  io = socketio.listen(server)
  io.sockets.on('connection', function (socket) {
    console.log('a user', socket.id, 'is connected')
    createUserName(socket)
    console.log(userDetails)
    relayMessage(socket)
    disconnectUser(socket)
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
  const createUserName = socket => userDetails.push({
    id: socket.id, userName: 'user '.concat(++userCount)
  })
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
  const getUserName = socket => userDetails[getUserIndex(socket.id)].userName

  const dropUser = socket => userDetails.splice(getUserIndex(socket.id), 1)

  const getUserIndex = userId => userDetails.map(user => user.id === userId).indexOf(true)
}
