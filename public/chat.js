document.addEventListener('DOMContentLoaded', function () {
  var messages = []
  const socket = io.connect()
  const field = document.getElementById('data')
  const sendButton = document.getElementById('send')
  const content = document.getElementById('content')
  sendButton.onclick = function () {
    messages.push(field.value)
    socket.emit('chatMessage', field.value)
    return false
  }
  socket.on('chatMessage', (msg) => {
    let li = document.createElement('li')
    let text = msg.user + ' : ' + msg.text
    li.appendChild(document.createTextNode(text))
    content.appendChild(li)
  })
})
