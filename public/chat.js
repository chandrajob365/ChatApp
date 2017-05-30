document.addEventListener('DOMContentLoaded', function () {
  var messages = []
  const socket = io.connect()
  const defaultActiveUsers = document.getElementById('defaultActiveUsers')
  const room1ActiveUsers = document.getElementById('room1ActiveUsers')
  const room2ActiveUsers = document.getElementById('room2ActiveUsers')
  console.log('room1ActiveUsers-> ', room1ActiveUsers, '  room2ActiveUsers-> ', room2ActiveUsers)
  const defaultRoomContent = document.getElementById('defaultRoomContent')
  const room1Content = document.getElementById('room1Content')
  const room2Content = document.getElementById('room2Content')
  const field = document.getElementById('data')
  const sendButton = document.getElementById('send')
  const selectRooms = document.getElementById('selectRooms')
  const joinButton = document.getElementById('join')
  const switchRooms = document.getElementById('switchRooms')
  const switchButton = document.getElementById('switchButton')

  var roomUsersObj = {}
  var rooms = []
  var currentRoom = 'Default Room'
  let selectedRoomIndex
  // socket.emit('activeUsers')
  sendButton.onclick = function () {
    messages.push(field.value)
    console.log('<chat.js sendButton.onclick() >, currentRoom-> ', currentRoom)
    socket.emit('chatMessage', {
      text: field.value,
      room: currentRoom
    })
    return false
  }

  joinButton.onclick = function () {
    console.log('Entry joinButton onClick() event')
    let selectedRoom = selectRooms.options[selectRooms.selectedIndex].value
    selectedRoomIndex = selectRooms.selectedIndex
    console.log('selectedRoomIndex->', selectedRoomIndex)
    console.log('roomName->', currentRoom)
    currentRoom = selectedRoom
    console.log('roomName->', currentRoom)
    socket.emit('joinRoom', {
      room: currentRoom
    })
    return false
  }

  switchButton.onclick = function () {
    console.log('<chat.js, switchButton.onclick> Entry')
    let roomToSwitch = switchRooms.options[switchRooms.selectedIndex].value
    currentRoom = roomToSwitch
    console.log('<chat.js, switchButton.onclick> roomToSwitch/currentRoom -> ', roomToSwitch)
    toggleUsersAndMessageViewPannel(currentRoom)
    return false
  }

  socket.on('chatMessage', (msg) => {
    console.log('<chat.js, chatMessage >msg-> ', msg)
    console.log('<chat.js, chatMessage > currentRoom-> ', currentRoom, ' msg.room-> ', msg.room)
    // if (currentRoom === msg.room) {
      createChildNode(getContentDisplayPannelForRoom(msg.room), msg.text)
      getIndividualUser(msg.room, getUserListDisplayPannelForRoom(msg.room), msg.users)
      console.log('<chat.js, chatMessage > roomUsersObj->', roomUsersObj)
      if (rooms.indexOf(msg.room) === -1) {
        rooms.push(msg.room)
        createRoomNode(switchRooms, msg.room)
      }
    // }
  })
  socket.on('joinRoom', (msg) => {
    console.log('<chat.js, joinResult >, msg->', msg)
    selectRooms.remove(selectedRoomIndex)
    if (selectRooms.length === 0) {
      selectRooms.remove()
      joinButton.remove()
    }
    toggleUsersAndMessageViewPannel(msg.room)
  })
  const toggleUsersAndMessageViewPannel = room => {
    console.log('<chat.js, toggleUsersAndMessageViewPannel > room ->', room)
    switch (room) {
      case 'Default Room': console.log('Inside Default Room case')
        defaultRoomContent.style.display = 'block'
        room1Content.style.display = 'none'
        room2Content.style.display = 'none'
        defaultActiveUsers.style.display = 'block'
        room1ActiveUsers.style.display = 'none'
        room2ActiveUsers.style.display = 'none'
        break;
      case 'Room1': console.log('Inside  Room1  case')
        defaultRoomContent.style.display = 'none'
        room1Content.style.display = 'block'
        room2Content.style.display = 'none'
        defaultActiveUsers.style.display = 'none'
        room1ActiveUsers.style.display = 'block'
        room2ActiveUsers.style.display = 'none'
        break;
      case 'Room2': console.log('Inside  Room2  case')
        defaultRoomContent.style.display = 'none'
        room1Content.style.display = 'none'
        room2Content.style.display = 'block'
        defaultActiveUsers.style.display = 'none'
        room1ActiveUsers.style.display = 'none'
        room2ActiveUsers.style.display = 'block'
        break;
    }
  }
  toggleUsersAndMessageViewPannel('Default Room')

  const getIndividualUser = (room, userPannel, users) => {
    for (var user in users) {
      createRoomUsersObj(room, userPannel, users[user])
    }
  }
  const createRoomUsersObj = (room, userPannel, user) => {
    if (!roomUsersObj[room]) {
      roomUsersObj[room] = []
    } if (roomUsersObj[room].indexOf(user) === -1) {
      roomUsersObj[room].push(user)
      createChildNode(userPannel, user)
    }
  }
  const createChildNode = (node, data) => {
    let li = document.createElement('li')
    li.appendChild(document.createTextNode(data))
    li.classList.add('marginStyle')
    node.appendChild(li)
  }
  const createRoomNode = (node, data) => {
    node.appendChild(addOptions(node, data))
  }

  const addOptions = (node, data) => {
    var option = document.createElement('option')
    option.text = data
    option.value = data
    return option
  }
  const clearNodes = (node, data) => {
    while(node.firstChild) {
      node.removeChild(node.firstChild)
      data.splice(0, data.length)
    }
  }
  const getContentDisplayPannelForRoom = (room) => {
    if(room === 'Default Room') return defaultRoomContent
    if(room === 'Room1') return room1Content
    if(room === 'Room2') return room2Content
  }
  const getUserListDisplayPannelForRoom = (room) => {
    if(room === 'Default Room') return defaultActiveUsers
    if(room === 'Room1') return room1ActiveUsers
    if(room === 'Room2') return room2ActiveUsers
  }
})
