const UserDB = require('../db/userdb').Users
const bcrypt = require('bcryptjs')
exports.form = (req, res, next) => {
  res.render('login', {title: 'Login Page'})
}

exports.submit = (req, res, next) => {
  let data = req.body.user
  console.log('from login submit')
  console.log('data->', data)
  console.log('data.name->', data.name, 'data.pass->', data.pass)
  UserDB.find(data, (err, user) => {
    console.log('user from db ->', user)
    if(err) return next(err)
    console.log('user->', user)
    if (!user) {
      console.log('User Not found with user name : ', data.name)
      return res.redirect('back')
    }if (!isValidPassword(data, user)) {
      console.log('Invalid password')
      return res.redirect('back')
    }
    //req.session.put
    return res.redirect('/')
  })
}

function isValidPassword (data, user) {
  console.log('Entry isValidPassword')
  let res = bcrypt.compareSync(data.pass, user.pass)
  console.log('res->', res)
  return res
}
