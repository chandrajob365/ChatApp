const UserDB = require('../db/userdb').Users
exports.ui = (req, res, next) => {
  if (req.session && req.session.user) {
    let name = req.session.user.userName
    req.userName = res.locals.userName = name
    getAllUsers(res, name)
  } else {
    res.redirect('/')
  }
}

getAllUsers = (res, name) => {
  UserDB.all((err, users) => {
    if (err) throw new Error(err)
    if (users.length > 0) {
      res.render('chat_ui', {
        userName: name,
        users: users
      })
    } else {
      res.render('chat_ui', {
        userName: name,
        users: []
      })
    }
  })
}
exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    if(err) throw err
    res.redirect('/')
  })
}
