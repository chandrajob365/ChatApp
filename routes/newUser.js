const UserDB = require('../db/userdb').Users

exports.save = (req, res, next) => {
  var data = req.body.user
  UserDB.insert(data, (err, user) => {
    if (err) throw new Error(err)
    retriveUserDetailAndRedirect(data.phoneNumber, req, res)
  })
}

const retriveUserDetailAndRedirect = (phoneNumber, req, res) => {
  UserDB.findByPhoneNumber(phoneNumber, (err, user) => {
    if (err) throw new Error(err)
    if (user) {
      req.session.user = user
      res.redirect('chatRelay')
    } else {
      res.writeHead(200, {
        'Content-Type': 'text/html'
      })
      res.end('Something went wrong while retriving user detail :( ')
    }
  })
}
