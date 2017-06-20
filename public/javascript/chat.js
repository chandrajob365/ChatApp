const socket = io.connect()
var currentGroup = '' // !! update currentRoom as when user switches to diff room !!
document.addEventListener('DOMContentLoaded', function () {
  var messages = []
  const field = document.getElementById('data')
  const sendButton = document.getElementById('send')
  var roomUsersObj = {}
  var rooms = []

  // socket.emit('activeUsers')
  socket.on('setDefaultRoom', (groupName) => {
    console.log('<client chat.js setDefaultRoom> groupName = ', groupName)
    currentGroup = groupName
    populateCurrentGroupName(currentGroup)
  })
  socket.on('disableMessageSenderBoxAndSendButton', () => {
    field.disabled = true
    sendButton.disabled = true
  })
  socket.on('enableMessageSenderBoxAndSendButton', () => {
    field.disabled = false
    sendButton.disabled = false
  })
  sendButton.onclick = function () {
     console.log('<client chat.js onclick> currentGroup = ', currentGroup)
     if (currentGroup.length > 0) {
       socket.emit('chatMessage', {
         groupName: currentGroup,
         text: field.value
       })
     }
     field.value = ''
    return false
  }
  socket.on('chatMessage', (msg) => {
    console.log('<chat.js chatMessage> currentGroup = ', currentGroup)
    console.log('<chat.js chatMessage> msg.groupName = ', msg.groupName)
    if(currentGroup === msg.groupName) {
      console.log('<chat.js chatMessage> currentGroup === msg.groupName')
      populateCurrentGroupName(msg.groupName)
      populateMessagePannel(msg)
    }
  })

  socket.on('createGroup', (obj) => {
    field.disabled = false
    sendButton.disabled = false
    console.log('<chat.js>Inside createGroup -> ', obj)
    populateGroup(obj.groupName)
    if (currentGroup === '') {
      currentGroup = obj.groupName
      populateCurrentGroupName(obj.groupName)
    }
    // !! < Method to display system messages > Add method to relay welcome message to all the member of group !!
  })
})
/* Emits event to server to save new group , created by clicking "createGroup" button on UI */
const createGroup = () => {
  let groupName = document.getElementById('groupName').value
  let userList = document.getElementById('usersAdded').value
  if(groupName.length !== 0 && userList.length !== 0) {
    let users = userList.split(' ').filter(item => item)
    console.log('</public/javascript/chat.js createGroup > userList-> ', userList)
    console.log('</public/javascript/chat.js createGroup > users-> ', users)

    socket.emit('createGroup', {
      groupName: groupName,
      users: users
    })
    // Below code closes modal
    let modal = document.getElementById('modal_newRoom')
    modal.classList.remove('is-active')
  }
}



  /* Creates new group in view of all the users added to that group */
  const populateGroup = groupName => {
    let groupUserWrapper = document.getElementById('groupsAndUsers')
    let div1 = document.createElement('div')
    div1.classList.add('columns')

    let div2ChildOfDiv1 = document.createElement('div')
    div2ChildOfDiv1.classList.add('column', 'is-3')
    let div3ChildOfDiv2 = document.createElement('div')
    div3ChildOfDiv2.classList.add('image')
    let img = document.createElement('img')
    img.src = 'http://bulma.io/images/placeholders/96x96.png'
    div3ChildOfDiv2.appendChild(img)
    div2ChildOfDiv1.appendChild(div3ChildOfDiv2)

    let div4ChildOfDiv1 = document.createElement('div')
    div4ChildOfDiv1.classList.add('column', 'is-6')
    let span = document.createElement('span')
    span.style.cursor = 'pointer' // !! Add onclick on span to populate group content !!
    span.addEventListener('click', function () {
      console.log('groupName -> ', groupName)
      switchGroup(groupName)
    }, true)
    let strong = document.createElement('strong')
    strong.appendChild(document.createTextNode(groupName))
    span.appendChild(strong)
    div4ChildOfDiv1.appendChild(span)

    let hr = document.createElement('hr')
    div1.appendChild(div2ChildOfDiv1)
    div1.appendChild(div4ChildOfDiv1)
    groupUserWrapper.appendChild(div1)
    groupUserWrapper.appendChild(hr)
  }
  const switchGroup = groupName => {
    console.log('Inside switchGroup <chat.js> client side groupName -> ', groupName)
    currentGroup = groupName
    console.log('Inside switchGroup <chat.js> client side currentGroup -> ', currentGroup)
      clearMessagePannel()
    socket.emit('switchGroup', {
      name: groupName
    })
  }
  socket.on('populateGroupWithEmptyMessageList', groupName => {
    console.log('Inside of populateGroupName <chat.js client side> currentGroup = ', currentGroup, 'groupName.name = ', groupName.name)
    if(currentGroup === groupName.name) {
      console.log('<chat.js chatMessage> currentGroup === groupName.name')
      populateCurrentGroupName(groupName.name)
    }
  })
  const showModal = elementId => {
    let modal = document.getElementById('modal_newRoom')
    modal.classList.add('is-active')
  }

const closeModal = elementId => {
  let modal = document.getElementById('modal_newRoom')
  modal.classList.remove('is-active')
}
const addToTextBox = obj => {
  let user = obj.value
  let displayUser = document.getElementById('usersAdded')
  if (displayUser.value.indexOf(user) === -1) {
    displayUser.value += ' ' + user + ' '
  }
}
const populateCurrentGroupName = groupName => {
  let currentGroup = document.getElementById('currentGroup')
  currentGroup.innerHTML = groupName
  // currentGroup.addEventListener('click', () => {
  //   displayGroupMembersCard(groupName)
  // }, true)
}
// const displayGroupMembersCard = groupName => {
//
// }
const populateMessagePannel = msg => {
  let messageContentWrapper = document.getElementById('messageContent')
  let article = document.createElement('article')
  article.classList.add('media')
  let div1ChildOfArticle = document.createElement('div')
  div1ChildOfArticle.classList.add('media-left')
  let figure = document.createElement('figure')
  figure.classList.add('image', 'is-64x64')
  let img = document.createElement('img')
  img.src = 'http://placehold.it/128x128'
  img.alt = 'Image'
  figure.appendChild(img)
  div1ChildOfArticle.appendChild(figure)
  article.appendChild(div1ChildOfArticle)
  let div2ChildOfArticle = document.createElement('div')
  div2ChildOfArticle.classList.add('media-content')
  let div3ChildOfDiv2 = document.createElement('div')
  div3ChildOfDiv2.classList.add('content')
  let p = document.createElement('p')
  let strong = document.createElement('strong')
  strong.appendChild(document.createTextNode(msg.sender))
  p.appendChild(strong)
  let br = document.createElement('br')
  let msgText = document.createTextNode(msg.text)

  p.insertBefore(br, p.appendChild(msgText))
  div3ChildOfDiv2.appendChild(p)
  let nav = document.createElement('nav')
  nav.classList.add('level')
  let divChildOfNav = document.createElement('div')
  divChildOfNav.classList.add('level-left')
  let a = document.createElement('a')
  a.classList.add('level-item')
  let span = document.createElement('span')
  span.classList.add('icon', 'is-small')
  let i = document.createElement('i')
  i.classList.add('fa', 'fa-reply')
  span.appendChild(i)
  a.appendChild(span)
  divChildOfNav.appendChild(a)
  nav.appendChild(divChildOfNav)
  div2ChildOfArticle.appendChild(div3ChildOfDiv2)
  div2ChildOfArticle.appendChild(nav)
  article.appendChild(div1ChildOfArticle)
  article.appendChild(div2ChildOfArticle)
  let hr = document.createElement('hr')
  messageContentWrapper.appendChild(article)
  messageContentWrapper.appendChild(hr)
}

const clearMessagePannel = () => {
  let messageContentWrapper = document.getElementById('messageContent')
  messageContentWrapper.innerHTML = ''
}
