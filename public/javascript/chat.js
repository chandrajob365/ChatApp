const socket = io.connect()
var currentGroup = '' // !! update currentRoom as when user switches to diff room !!
document.addEventListener('DOMContentLoaded', function () {
  const field = document.getElementById('data')
  const sendButton = document.getElementById('send')

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
    if (currentGroup === msg.groupName) {
      console.log('<chat.js chatMessage> currentGroup === msg.groupName')
      populateCurrentGroupName(msg.groupName)
      populateMessagePannel(msg)
    }
  })

  socket.on('createGroup', (groupName) => {
    field.disabled = false
    sendButton.disabled = false
    console.log('<chat.js>Inside createGroup -> ', groupName)
    populateGroup(groupName)
    if (currentGroup === '') {
      currentGroup = groupName
      populateCurrentGroupName(groupName)
    }
    // !! < Method to display system messages > Add method to relay welcome message to all the member of group !!
  })
})
/* Emits event to server to save new group , created by clicking "createGroup" button on UI */
const createGroup = () => {
  let groupName = document.getElementById('groupName').value
  let userList = document.getElementById('usersAdded').value
  if (groupName.length !== 0 && userList.length !== 0) {
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
    div1.setAttribute('id', groupName)

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
    if (currentGroup !== groupName) {
      currentGroup = groupName
      console.log('Inside switchGroup <chat.js> client side currentGroup -> ', currentGroup)
        clearMessagePannel()
        resizeChatUIAndHideGroupInfoPannel('groupInfoPannel')
      socket.emit('switchGroup', {
        name: groupName
      })
    }
    console.log('currentGroup and group to be switched are same')

  }
  socket.on('populateGroupWithEmptyMessageList', groupName => {
    console.log('Inside of populateGroupName <chat.js client side> currentGroup = ', currentGroup, 'groupName.name = ', groupName.name)
    if(currentGroup === groupName.name) {
      console.log('<chat.js chatMessage> currentGroup === groupName.name')
      populateCurrentGroupName(groupName.name)
    }
  })


  const showModal = modalId => {
    let modal = document.getElementById(modalId)
    modal.classList.add('is-active')
  }

const closeModal = modalId => {
  let modal = document.getElementById(modalId)
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
  currentGroup.style.cursor = 'pointer'
  currentGroup.innerHTML = groupName
}

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
const displayGroupInfoCard = () => {
  let currentGroup = document.getElementById('currentGroup').innerHTML
  console.log('Inside displayGroupInfoCard groupName -> ', currentGroup)
  if(document.getElementById('groupInfoPannel').style.display === 'none')
    socket.emit('getGroupDetail', currentGroup)
}

socket.on('populateGroupInfo', groupInfoObj => {
  console.log('<chat.js client side populateGroupInfo > groupInfoObj -> ', groupInfoObj)
  if(!groupInfoObj.isAdmin) {
    document.getElementById('displayAddParticipantText').style.display = 'none'
  } else {
    document.getElementById('displayAddParticipantText').style.display = 'block'
  }
  resizeUiAndPopulateAdminGroupInfoPannel(groupInfoObj)
})
const resizeChatUIAndShowGroupInfoPannel = () => {
  let messagePannel = document.getElementById('messagePannel')
  messagePannel.className = messagePannel.className.replace('is-9', 'is-6')
  let msgInputPannel = document.getElementById('msgInputPannel')
  msgInputPannel.className = msgInputPannel.className.replace('is-9', 'is-6')
  document.getElementById('groupInfoPannel').style.display = 'block'
}
const resizeChatUIAndHideGroupInfoPannel = pannelId => {
  emptyMemberListPannel()
  document.getElementById(pannelId).style.display = 'none'
  let messagePannel = document.getElementById('messagePannel')
  messagePannel.className = messagePannel.className.replace('is-6', 'is-9')
  let msgInputPannel = document.getElementById('msgInputPannel')
  msgInputPannel.className = msgInputPannel.className.replace('is-6', 'is-9')
}
const emptyMemberListPannel = () => {
  var elements = document.getElementById('groupMemberDisplayCard').getElementsByTagName('hr')
  while (elements[0]) elements[0].parentNode.removeChild(elements[0])
  let memberInfoRows = document.getElementsByClassName('groupMemberList')
  console.log('memberInfoRows -> ', memberInfoRows)
  Array.prototype.forEach.call(memberInfoRows, (memberInfoRow) => {
    memberInfoRow.innerHTML = ''
  })
}
const resizeUiAndPopulateAdminGroupInfoPannel = groupInfoObj => {
  console.log('Inside Admin pannel')
  resizeChatUIAndShowGroupInfoPannel()
  populateAdminGroupInfoPannel(groupInfoObj)
}
const populateAdminGroupInfoPannel = groupInfoObj => {
  for (let userName of groupInfoObj.userList) {
    let groupMemberDisplayWrapper = document.getElementById('groupMemberDisplayCard')
    let hr = document.createElement('hr')
    groupMemberDisplayWrapper.appendChild(hr)
    let div1Outter = document.createElement('div')
    div1Outter.classList.add('columns', 'groupMemberList')
    div1Outter.setAttribute('id', userName)
    paintMemberImage(div1Outter)
    paintMemberName(div1Outter, userName)
    console.log('groupInfoObj.adminName -> ', groupInfoObj.adminName)
    if (userName === groupInfoObj.adminName) {
      paintAdmin(div1Outter)
    } else if(groupInfoObj.isAdmin) { // If user is admin then only give him option to delete any user
      paintDeleteButton(div1Outter, userName)
    }
    groupMemberDisplayWrapper.appendChild(div1Outter)
  }
}
const paintMemberImage = div1Outter => {
  let div2ChildOfDiv1 = document.createElement('div')
  div2ChildOfDiv1.classList.add('column', 'is-3', 'is-marginless')
  let div3ChildOfDiv2 = document.createElement('div')
  div3ChildOfDiv2.classList.add('image')
  let img = document.createElement('img')
  img.src = 'http://bulma.io/images/placeholders/96x96.png'

  div3ChildOfDiv2.appendChild(img)
  div2ChildOfDiv1.appendChild(div3ChildOfDiv2)
  div1Outter.appendChild(div2ChildOfDiv1)
}
const paintMemberName = (div1Outter, userName) => {
  let div2ChildOfDiv1 = document.createElement('div')
  div2ChildOfDiv1.classList.add('column', 'is-6')
  let p = document.createElement('p')
  let strong = document.createElement('strong')
  strong.innerHTML = userName

  p.appendChild(strong)
  div2ChildOfDiv1.appendChild(p)
  div1Outter.appendChild(div2ChildOfDiv1)
}
const paintDeleteButton = (div1Outter, userName) => {
  let div2ChildOfDiv1 = document.createElement('div')
  div2ChildOfDiv1.classList.add('column', 'is-3')
  let button = document.createElement('button')
  button.classList.add('button', 'delete', 'is-danger')
  button.addEventListener('click', () => {
    console.log('<client side chat.js paintDeleteButton>Inside addEventListener Entry userName = ', userName)
    removeMemberFromGroup(userName)
  })
  div2ChildOfDiv1.appendChild(button)
  div1Outter.appendChild(div2ChildOfDiv1)
}
const paintAdmin = div1Outter => {
  let div2ChildOfDiv1 = document.createElement('div')
  div2ChildOfDiv1.classList.add('column', 'is-3')
  let span = document.createElement('span')
  span.classList.add('button', 'is-info', 'is-small', 'is-outlined')
  span.innerHTML = 'Admin'
  div2ChildOfDiv1.appendChild(span)
  div1Outter.appendChild(div2ChildOfDiv1)
}

/* Remove user from group and update user view Start */

const removeMemberFromGroup = userName => {
  console.log('<client side chat.js removeMemberFromGroup> Entry')
  // removeUserFromGroupView(userName)
  socket.emit('removeMemberFromGroup', {
    userName: userName,
    groupName: currentGroup
  })
}
const removeUserFromGroupView = userName => {
  console.log('<client side chat.js removeUserFromGroupView> Entry userName = ', userName)
  let divMemberNameWrapper = document.getElementById(userName)
  divMemberNameWrapper.previousSibling.remove()
  divMemberNameWrapper.innerHTML = ''
}
socket.on('removeGroupContentFromUserView', userGroupObj => {
  console.log('<client side chat.js removeGroupContentFromUserView> Entry')
  removeGroupRelatedContent(userGroupObj.groupName)
})
const removeGroupRelatedContent = groupName => {
  let groupNameWrapperDiv = document.getElementById(groupName)
  groupNameWrapperDiv.nextSibling.remove()
  groupNameWrapperDiv.innerHTML = ''
  if(currentGroup === groupName) {
    document.getElementById('currentGroup').innerHTML = ''
    document.getElementById('messageContent').innerHTML = ''
    let groupInfoPannel = document.getElementById('groupInfoPannel')
    if(groupInfoPannel.style.display === 'block')
      resizeChatUIAndHideGroupInfoPannel('groupInfoPannel')
  }
}
socket.on('removeMemberDetailFromGroupInfoPannel', userGroupObj => {
  if(currentGroup === userGroupObj.groupName && document.getElementById('groupInfoPannel').style.display === 'block') {
    removeUserFromGroupView(userGroupObj.userName)
  }
})

/* Remove user from group and update user view End */

/* Add Particapant Modal Related Start */
const showAndPopulateParticipantModal = modalId => {
  socket.emit('getNonMemberNames', currentGroup)
  showModal(modalId)
}
const closeAddParticipantModal = modalId => {
  document.getElementById('nonMemberUserList').innerHTML = ''
  closeModal(modalId)
}
socket.on('populateNonMemberList', nonMemberUserList => {
  let nonMemberUserListWrapperDiv = document.getElementById('nonMemberUserList')
  nonMemberUserListWrapperDiv.classList.add('field')
  for (let nonMember of nonMemberUserList) {
    paintNonMemberCheckBoxAndNames(nonMemberUserListWrapperDiv, nonMember.userName)
  }
})
const paintNonMemberCheckBoxAndNames = (nonMemberUserListWrapperDiv, nonMemberName) => {
  console.log('<chat.js client side paintNonMemberNames> nonMember = ', nonMemberName)
  let div1Outter = document.createElement('div')
  div1Outter.classList.add('columns')
  paintCheckBox(div1Outter, nonMemberName)
  paintMemberName(div1Outter, nonMemberName)
  nonMemberUserListWrapperDiv.appendChild(div1Outter)
}
const paintCheckBox = (div1Outter, nonMemberName) => {
  let div2ChildOfDiv1 = document.createElement('div')
  div2ChildOfDiv1.classList.add('column', 'is-1')
  let label = document.createElement('label')
  label.classList.add('checkbox')
  let checkbox = document.createElement('input')
  checkbox.classList.add('checkbox', 'is-medium')
  checkbox.type = 'checkbox'
  checkbox.name = 'nonMemberUsers'
  checkbox.value = nonMemberName
  checkbox.addEventListener('click', () => {
    console.log('Inside onclick event handler of checkBox')
    checkbox.checked ? (checkbox.setAttribute('checked', 'checked')) : (checkbox.removeAttribute('checked'))
  })
  label.appendChild(checkbox)
  div2ChildOfDiv1.appendChild(label)
  div1Outter.appendChild(div2ChildOfDiv1)
}
const addNewParticipant = () => {
  console.log('<client chat.js addNewParticipant> Entry addNewParticipant ')
  let newMembersListToBeAdded = []
  var checkBoxes = document.getElementsByName('nonMemberUsers')
  for (let checkBox of checkBoxes) {
    if(checkBox.checked) {
      console.log('<client chat.js addNewParticipant> checked checkBox value = ', checkBox.value)
      newMembersListToBeAdded.push(checkBox.value)
    }
  }
  closeAddParticipantModal('modalAddUser')
  if (newMembersListToBeAdded.length > 0) {
    socket.emit('addNewMembersToGroup', {
      users: newMembersListToBeAdded,
      groupName: currentGroup
    })
  }
  console.log('<client chat.js addNewParticipant> newMembersListToBeAdded = ', newMembersListToBeAdded)
}
socket.on('updateGroupInfoListwithNewUsers', groupUsersObj => {
  let groupInfoPannel = document.getElementById('groupInfoPannel')
  console.log('<client chat.js updateGroupInfoListwithNewUsers >, groupInfoObj = ', groupUsersObj)
  if (currentGroup === groupUsersObj.groupName && groupInfoPannel.style.display === 'block') {
    populateAdminGroupInfoPannel(groupUsersObj)
  }
})
socket.on('setCurrentRoom', groupName => {
  console.log('<client chat.js setCurrentRoom > groupName = ', groupName, 'currentGroup = ', currentGroup)
  if (currentGroup === '') {
    currentGroup = groupName
    console.log('<client chat.js setCurrentRoom > After setting groupName = ', groupName, 'currentGroup = ', currentGroup)
  }
})
socket.on('populateCurrentGroupName', groupName => {
  populateCurrentGroupName(groupName)
})
/* Add Particapant Modal Related End */

  /* Update user List in Create Group Modal Start*/
socket.on('updateUserList', userName => {
  console.log('<client chat.js updateUserList > userName = ', userName)
  let select = document.getElementById('userList')
  console.log('<client chat.js updateUserList > userName = ', select)
  console.log('<client chat.js updateUserList > select.options[', userName, ' ].index = ', select.options[select.options.length - 1])
  if(select.options.length > 0 && HTMLSelectContains(select, userName)) {
    console.log('<client chat.js updateUserList > Inside if select.options.indexOf(select.options.length-1).value = ', select.options[select.options.length - 1].value)
    select.add(new Option(userName, userName))
  }
})

const HTMLSelectContains = (select, userName) => {
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value === userName) {
      console.log('<client chat.js HTMLSelectContains > return false userName found')
      return false
    }
  }
  console.log('<client chat.js HTMLSelectContains > return true userName not found')
  return true
}
  /* Update user List in Create Group Modal Start*/
const clearMessagePannel = () => {
  let messageContentWrapper = document.getElementById('messageContent')
  messageContentWrapper.innerHTML = ''
}
