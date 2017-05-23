document.addEventListener('DOMContentLoaded', function () {
  var messages = []
  const socket = io.connect()
  const activeUsers = document.getElementById('activeUsers')
  const field = document.getElementById('data')
  const sendButton = document.getElementById('send')
  const content = document.getElementById('content')
  var childInnerHTMLArr = []
  socket.emit('activeUsers')
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
  socket.on('activeUsers', (listOfActiveUsers) => {
    console.log('listOfActiveUsers->', listOfActiveUsers)
    for (let i = 0; i < listOfActiveUsers.length; i++) {
      if (nodeExist(listOfActiveUsers[i]) === -1) {
        let li = document.createElement('li')
        li.appendChild(document.createTextNode(listOfActiveUsers[i]))
        activeUsers.appendChild(li)
      }
    }
  })
  socket.on('updateActiveUsersList', (userName) => {
    var index = childInnerHTMLArr.indexOf(userName)
    activeUsers.removeChild(activeUsers.children[index])
  })
  function nodeExist (user) {
    let index = childInnerHTMLArr.indexOf(user)
    if (index === -1) childInnerHTMLArr.push(user)
    return index
  }
})
