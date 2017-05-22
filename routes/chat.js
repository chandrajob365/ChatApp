exports.ui = (req, res, next) => {
  if (req.session) {
    let name = req.session.user.userName
    console.log('</routes/chat.js , ui> userName -> ', name)
    req.userName = res.locals.userName = name
    res.render('chat_ui', {userName: name})
  } else {
                  
  }
}
