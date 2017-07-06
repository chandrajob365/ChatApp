const socket = io.connect()
var activeGroupId = 0 // !! update activeGroupId as when user switches to diff room !!
document.addEventListener('DOMContentLoaded', function () {
  const field = document.getElementById('data')
  const sendButton = document.getElementById('send')

  socket.on('setDefaultGroupId', (groupName, groupId) => {
    activeGroupId = groupId
    populateCurrentGroupName(groupName)
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
    if (activeGroupId !== 0) {
      socket.emit('chatMessage', {
        groupId: activeGroupId,
        text: field.value
      })
    }
    field.value = ''
    return false
  }
  socket.on('chatMessage', (msg) => {
    pushToLocalStorage(msg.groupId, {
      sender: msg.sender,
      text: msg.text
    })
    if (activeGroupId === msg.groupId) {
      populateCurrentGroupName(msg.groupName)
      populateMessagePannel(msg)
    }
  })

  socket.on('createGroup', (groupObj) => {
    field.disabled = false
    sendButton.disabled = false
    populateGroup(groupObj.groupName, groupObj.groupId)
    if (activeGroupId === 0) {
      activeGroupId = groupObj.groupId
      populateCurrentGroupName(groupObj.groupName)
    }
    // !! < Method to display system messages > Add method to relay welcome message to all the member of group !!
  })
})

/* Creates new group in view of all the users added to that group */
const populateGroup = (groupName, groupId) => {
  let groupUserWrapper = document.getElementById('groupsAndUsers')
  let div1 = document.createElement('div')
  div1.classList.add('columns')
  div1.setAttribute('id', groupId)

  let div2ChildOfDiv1 = document.createElement('div')
  div2ChildOfDiv1.classList.add('column', 'is-3')
  let div3ChildOfDiv2 = document.createElement('div')
  div3ChildOfDiv2.classList.add('image')
  let img = document.createElement('img')
  // img.classList.add('responsive')
  img.src = 'https://bulma.io/images/placeholders/96x96.png'
  div3ChildOfDiv2.appendChild(img)
  div2ChildOfDiv1.appendChild(div3ChildOfDiv2)

  let div4ChildOfDiv1 = document.createElement('div')
  div4ChildOfDiv1.classList.add('column', 'is-6')
  let span = document.createElement('span')
  span.style.cursor = 'pointer' // !! Add onclick on span to populate group content !!
  span.addEventListener('click', function () {
    switchGroup(groupName, groupId)
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
const switchGroup = (groupName, groupId) => {
  if (activeGroupId !== groupId) {
    activeGroupId = groupId
    document.getElementById('data').disabled = false
    document.getElementById('send').disabled = false
    clearMessagePannel()
    resizeChatUIAndHideGroupInfoPannel('groupInfoPannel')
    socket.emit('switchGroup', {
      groupName: groupName,
      groupId: groupId
    })
  }
}
socket.on('populateGroupWithEmptyMessageList', groupObj => {
  if (activeGroupId === groupObj.groupId)
    populateCurrentGroupName(groupObj.groupName)
})

/* For showing and populating "CreateGroup" Modal Start */
const showModal = modalId => {
  let modal = document.getElementById(modalId)
  modal.classList.add('is-active')
}

const closeModal = modalId => {
  let modal = document.getElementById(modalId)
  modal.classList.remove('is-active')
  if (modalId === 'modal_newRoom') resetModal(modalId)
}
const resetModal = modalId => {
  document.getElementById('usersAdded').value = ''
  document.getElementById('groupName').value = ''
  let userList = document.getElementById('userList')
  userList.options[0].selected = true
}
const addToTextBox = obj => {
  let user = obj.value
  let displayUser = document.getElementById('usersAdded')
  if (displayUser.value.indexOf(user) === -1) {
    displayUser.value += ' ' + user + ' '
  }
}
const createGroup = () => {
  let groupName = document.getElementById('groupName').value
  let userList = document.getElementById('usersAdded').value
  if (groupName.length !== 0 && userList.length !== 0) {
    let users = userList.split(' ').filter(item => item)
    socket.emit('createGroup', {
      groupName: groupName,
      users: users
    })
    closeModal('modal_newRoom')
  }
}
/* For showing and populating "CreateGroup" Modal End */

const populateCurrentGroupName = groupName => {
  let currentGroup = document.getElementById('currentGroup')
  currentGroup.style.cursor = 'pointer'
  currentGroup.innerHTML = groupName
}

const populateMessagePannel = msg => {
  let messageContentWrapper = document.getElementById('messageContent')
  messageContentWrapper.classList.add('break-word')
  let article = document.createElement('article')
  article.classList.add('media')
  let div1ChildOfArticle = document.createElement('div')
  div1ChildOfArticle.classList.add('media-left')
  let figure = document.createElement('figure')
  figure.classList.add('image', 'is-64x64')
  let img = document.createElement('img')
  img.src = 'https://placehold.it/128x128'
  img.alt = 'Image'
  figure.appendChild(img)
  div1ChildOfArticle.appendChild(figure)
  article.appendChild(div1ChildOfArticle)
  let div2ChildOfArticle = document.createElement('div')
  div2ChildOfArticle.classList.add('media-content')
  let div3ChildOfDiv2 = document.createElement('div')
  div3ChildOfDiv2.classList.add('content')
  let p = document.createElement('p')
  // p.classList.add('break-word')
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
  let currentGroupName = document.getElementById('currentGroup').innerHTML
  if (document.getElementById('groupInfoPannel').style.display === 'none')
    socket.emit('getGroupDetail', {
      groupId: activeGroupId,
      groupName: currentGroupName
    })
}

socket.on('populateGroupInfo', groupInfoObj => {
  displayAddParticipantText(groupInfoObj)
  resizeUiAndPopulateAdminGroupInfoPannel(groupInfoObj)
})
const displayAddParticipantText = groupInfoObj => {
  if (!groupInfoObj.isAdmin)
    document.getElementById('displayAddParticipantText').style.display = 'none'
  else
    document.getElementById('displayAddParticipantText').style.display = 'block'
}
const resizeChatUIAndShowGroupInfoPannel = () => {
  toggleWordWrapMessageContent(document.getElementById('messageContent'), 'break-word', 'break-word-info')
  let messagePannel = document.getElementById('messagePannel')
  messagePannel.className = messagePannel.className.replace('is-9', 'is-6')
  let msgInputPannel = document.getElementById('msgInputPannel')
  msgInputPannel.className = msgInputPannel.className.replace('is-9', 'is-6')
  document.getElementById('groupInfoPannel').style.display = 'block'
}
const resizeChatUIAndHideGroupInfoPannel = pannelId => {
  emptyMemberListPannel()
  // toggleWordWrapClass(document.getElementsByClassName('content'), 'break-word-info', 'break-word')
  toggleWordWrapMessageContent(document.getElementById('messageContent'), 'break-word-info', 'break-word')
  document.getElementById(pannelId).style.display = 'none'
  let messagePannel = document.getElementById('messagePannel')
  messagePannel.className = messagePannel.className.replace('is-6', 'is-9')
  let msgInputPannel = document.getElementById('msgInputPannel')
  msgInputPannel.className = msgInputPannel.className.replace('is-6', 'is-9')
}

const toggleWordWrapMessageContent = (messageContent, olderClass, newClass) => {
  messageContent.className = messageContent.className.replace(olderClass, newClass)
}
const emptyMemberListPannel = () => {
  let elements = document.getElementById('groupMemberDisplayCard').getElementsByTagName('hr')
  removeNodeList(elements)
  let memberInfoRows = document.getElementsByClassName('groupMemberList')
  removeNodeList(memberInfoRows)
}
const removeNodeList = nodeList => {
  while (nodeList[0]) nodeList[0].parentNode.removeChild(nodeList[0])
}
const resizeUiAndPopulateAdminGroupInfoPannel = groupInfoObj => {
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
    if (userName === groupInfoObj.adminName) {
      paintAdmin(div1Outter)
    } else if (groupInfoObj.isAdmin) { // If user is admin then only give him option to delete any user
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
  img.src = 'https://bulma.io/images/placeholders/96x96.png'

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
  socket.emit('removeMemberFromGroup', {
    userName: userName,
    groupId: activeGroupId
  })
}
const removeUserFromGroupView = userName => {
  let divMemberNameWrapper = document.getElementById(userName)
  divMemberNameWrapper.previousSibling.remove()
  divMemberNameWrapper.parentNode.removeChild(divMemberNameWrapper)
}
socket.on('removeGroupContentFromUserView', userGroupObj => {
  removeGroupRelatedContent(userGroupObj.groupId)
})
const removeGroupRelatedContent = groupId => {
  let groupIdWrapperDiv = document.getElementById(groupId)
  groupIdWrapperDiv.nextSibling.remove()
  groupIdWrapperDiv.parentNode.removeChild(groupIdWrapperDiv)
  if (activeGroupId === groupId) {
    document.getElementById('currentGroup').innerHTML = ''
    document.getElementById('messageContent').innerHTML = ''
    let groupInfoPannel = document.getElementById('groupInfoPannel')
    if (groupInfoPannel.style.display === 'block') {
      resizeChatUIAndHideGroupInfoPannel('groupInfoPannel')
    }
    activeGroupId = 0
    document.getElementById('data').disabled = true
    document.getElementById('send').disabled = true
  }

}
socket.on('removeMemberDetailFromGroupInfoPannel', userGroupObj => {
  if (activeGroupId === userGroupObj.groupId && document.getElementById('groupInfoPannel').style.display === 'block')
    removeUserFromGroupView(userGroupObj.userName)
})

/* Remove user from group and update user view End */

/* "Add-Particapant" Modal Related Start */
const showAndPopulateParticipantModal = modalId => {
  socket.emit('getNonMemberNames', activeGroupId)
  showModal(modalId)
}
const closeAddParticipantModal = modalId => {
  document.getElementById('nonMemberUserList').innerHTML = ''
  // document.getElementById('nonMemberUserList').parentNode.remove(document.getElementById('nonMemberUserList'))
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
    checkbox.checked ? (checkbox.setAttribute('checked', 'checked')) : (checkbox.removeAttribute('checked'))
  })
  label.appendChild(checkbox)
  div2ChildOfDiv1.appendChild(label)
  div1Outter.appendChild(div2ChildOfDiv1)
}
const addNewParticipant = () => {
  let newMembersListToBeAdded = []
  var checkBoxes = document.getElementsByName('nonMemberUsers')
  for (let checkBox of checkBoxes) {
    if (checkBox.checked) {
      newMembersListToBeAdded.push(checkBox.value)
    }
  }
  closeAddParticipantModal('modalAddUser')
  if (newMembersListToBeAdded.length > 0) {
    socket.emit('addNewMembersToGroup', {
      users: newMembersListToBeAdded,
      groupId: activeGroupId
    })
  }
}
socket.on('updateGroupInfoListwithNewUsers', groupUsersObj => {
  let groupInfoPannel = document.getElementById('groupInfoPannel')
  if (activeGroupId === groupUsersObj.groupId && groupInfoPannel.style.display === 'block') {
    populateAdminGroupInfoPannel(groupUsersObj)
  }
})
socket.on('setCurrentRoom', groupId => {
  if (activeGroupId === 0)
    activeGroupId = groupId
})
socket.on('populateCurrentGroupName', groupName => {
  populateCurrentGroupName(groupName)
})
/* Add Particapant Modal Related End */

/* Update user List in Create Group Modal Start */
socket.on('updateUserList', userName => {
  let select = document.getElementById('userList')
  if (select.options.length > 0 && HTMLSelectContains(select, userName))
    select.add(new Option(userName, userName))
})

const HTMLSelectContains = (select, userName) => {
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value === userName)
      return false
  }
  return true
}
/* Update user List in Create Group Modal Start */
const clearMessagePannel = () => {
  let messageContentWrapper = document.getElementById('messageContent')
  messageContentWrapper.innerHTML = ''
}
/* Exit group Start */
const exitGroup = () => {
  socket.emit('exitGroup', {
    groupId: activeGroupId
  })
}
socket.on('repaintGroupInfo', groupInfoObj => {
  let groupInfoPannel = document.getElementById('groupInfoPannel')
  if (groupInfoObj.groupId === activeGroupId && groupInfoPannel.style.display === 'block') {
    emptyMemberListPannel()
    repaintGroupInfo(groupInfoObj)
  }
})
const repaintGroupInfo = groupInfoObj => {
  displayAddParticipantText(groupInfoObj)
  populateAdminGroupInfoPannel(groupInfoObj)
}
/* Exit group End */

/* localStorage Related Start */

socket.on('chkAndFetchLocalStorage', groupObj => {
  if (window.localStorage && activeGroupId === groupObj.groupId) {
    chkAndFetchLocalStorage(groupObj)
  }
})
const chkAndFetchLocalStorage = groupObj => {
  let messageList = localStorage.getItem(groupObj.groupId)
  console.log('<chkAndFetchLocalStorage> messageList : ', messageList)
  if (messageList) {
    parseAndPopulateMsgPannel(groupObj, JSON.parse(messageList))
    if (JSON.parse(messageList) instanceof Array)
      chkServerForExtraGroupMsgs(groupObj, (JSON.parse(messageList)).length)
    else
      chkServerForExtraGroupMsgs(groupObj, 1)
  } else
    socket.emit('fetchMessageFromDB', groupObj)
}
const parseAndPopulateMsgPannel = (groupObj, messageList) => {
  if (messageList && messageList instanceof Array) {
    for (let messagesListObj of messageList) {
      let parsedMessageObj = JSON.parse(messagesListObj)
      populateCurrentGroupName(groupObj.groupName)
      populateMessagePannel(parsedMessageObj)
    }
  } else if (messageList instanceof Object) {
    populateCurrentGroupName(groupObj.groupName)
    populateMessagePannel(messageList)
  }
}
const chkServerForExtraGroupMsgs = (groupObj, messageListLength) => {
  socket.emit('chkServerForExtraGroupMsgs', {
    groupObj: groupObj,
    messageListLength: messageListLength
  })
}
socket.on('messageList', msg => {
  pushToLocalStorage(msg.groupId, msg.messageList)
  parseAndPopulateMsgPannel(msg, msg.messageList)
})
const pushToLocalStorage = (groupId, messageList) => {
  console.log('<pushToLocalStorage> groupId = ', groupId, ' messageList = ', messageList)
  if (window.localStorage) {
    let msgs = JSON.parse(localStorage.getItem(groupId))
    if (messageList instanceof Array)
      localStorage.setItem(groupId, JSON.stringify(messageList))
    else if (msgs && messageList instanceof Object) {
      msgs[msgs.length] = JSON.stringify(messageList)
      localStorage.setItem(groupId, JSON.stringify(msgs))
    } else if (messageList instanceof Object) {
      let arr = []
      arr.push(JSON.stringify(messageList))
      localStorage.setItem(groupId, JSON.stringify([JSON.stringify(messageList)]))
    }
  }
}
/* localStorage Related End */
