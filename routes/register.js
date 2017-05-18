const UserDB = require('../db/userdb').Users

exports.form = (req, res, next) => {
  res.render('register', {title: 'Welcome to Chat app'})
}
exports.submit = (req, res, next) => {
  let data = req.body.user
  console.log('data->', data)
  console.log('data.name->', data.name, 'data.pass->', data.pass)
  UserDB.find(data, (err, user) => {
    if (err) return next(err)
    console.log('user->', user)
    if (user) {
      console.log('user exists')
       //res.render('register', {err: 'UserName already taken'})
      // res.error('Username already taken')
      res.redirect('back')
    } else {
      UserDB.create(data, (err, user) => {
        if (err) return next(err)
        res.redirect('/')
      })
    }
  })
}
