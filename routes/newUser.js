const UserDB = require('../db/userdb').Users

exports.save = (req, res, next) => {
  var data = req.body.user
  UserDB.insert(data, (err, user) => {
    console.log('<newUser.js, save > callback from DB after insert user -> ', user)
    if (err) throw new Error(err)
    retriveUserDetailAndRedirect(data.phoneNumber, req, res)
  })
  console.log('<newUser.js save > data -> ', data)
}

const retriveUserDetailAndRedirect = (phoneNumber, req, res) => {
  console.log('<newUser.js, retriveUserDetailAndRedirect > Entry')
  UserDB.findByPhoneNumber(phoneNumber, (err, user) => {
    console.log('<newUser.js, retriveUserDetailAndRedirect > callback from findByPhoneNumber user -> ', user)
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
