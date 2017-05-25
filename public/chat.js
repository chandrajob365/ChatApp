document.addEventListener('DOMContentLoaded', function () {
  var messages = []
  const socket = io.connect()
  const activeUsers = document.getElementById('activeUsers')
  const field = document.getElementById('data')
  const sendButton = document.getElementById('send')
  const content = document.getElementById('content')
  const selectRooms = document.getElementById('selectRooms')
  const displayRooms = document.getElementById('displayRooms')
  const joinButton = document.getElementById('join')

  var activeUserChildInnerHTMLArr = []
  var displayRoomsChildNodeArr = []
  var activeUsersName = []
  socket.emit('activeUsers')
  sendButton.onclick = function () {
    messages.push(field.value)
    let activeRoom = displayRooms.lastChild.innerHTML
    console.log('<chat.js sendButton.onclick() >, activeRoom-> ', activeRoom)
    socket.emit('chatMessage', {
      msgTxt: field.value,
      room: activeRoom
    })
    return false
  }

  joinButton.onclick = function () {
    console.log('Entry joinButton onClick() event')
    let roomName = selectRooms.options[selectRooms.selectedIndex].value
    console.log('roomName->', roomName)
    socket.emit('joinRoom', {
      room: roomName
    })
    return false
  }
  socket.on('chatMessage', (msg) => {
    let text = msg.user + ' : ' + msg.text
    console.log('msg-> ', msg)
    console.log('<chat.js , chatMessage > displayRooms.lastChild.innerHTML->', displayRooms.lastChild.innerHTML)
    if(!displayRooms.lastChild.innerHTML || displayRooms.lastChild.innerHTML === msg.room) {
      createChildNodes(content, text)
    }
    if (msg.activeUsers && activeUsersName.indexOf(msg.activeUsers) === -1) {
      console.log('<chat.js , chatMessage > displayRooms.lastChild.innerHTML->', displayRooms.lastChild.innerHTML)
      console.log('<chat.js , chatMessage > msg.room->', msg.room)
      console.log('displayRooms.lastChild.innerHTML != msg.room => ', (displayRooms.lastChild.innerHTML != msg.room))
      if(displayRooms.lastChild.innerHTML != msg.room) {
        console.log('child removal')
        clearNodes(activeUsers, activeUsersName)
      }
      getIndividualUser(msg.activeUsers)
    }
    if (msg.room && displayRoomsChildNodeArr.indexOf(msg.room) === -1) {
      displayRoomsChildNodeArr.push(msg.room)
      createChildNodes(displayRooms, msg.room)
    }

  })
  socket.on('activeUsers', (users) => {
    console.log('listOfActiveUsers->', users)
    for (let i = 0; i < users.onLineUsers.length; i++) {
      if (nodeExist(users.onLineUsers[i]) === -1) {
        let li = document.createElement('li')
        li.appendChild(document.createTextNode(users.onLineUsers[i]))
        activeUsers.appendChild(li)
      }
    }
  })
  socket.on('updateActiveUsersList', (userName) => {
    var index = activeUserChildInnerHTMLArr.indexOf(userName)
    activeUsers.removeChild(activeUsers.children[index])
  })
  const nodeExist = user => {
    let index = activeUserChildInnerHTMLArr.indexOf(user)
    if (index === -1) activeUserChildInnerHTMLArr.push(user)
    return index
  }
  const createChildNodes = (node, data) => {
    let li = document.createElement('li')
    li.appendChild(document.createTextNode(data))
    node.appendChild(li)
  }
  const getIndividualUser = activeUserList => {
    for(var user in activeUserList) {
      if(activeUsersName.indexOf(activeUserList[user]) === -1) {
        activeUsersName.push(activeUserList[user])
        createChildNodes(activeUsers, activeUserList[user])
      }

    }
  }
  const clearNodes = (node, data) => {
    while(node.firstChild) {
      node.removeChild(node.firstChild)
      data.splice(0, data.length)
    }
  }
})
