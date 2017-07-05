const Request = require('request')
const Querystring = require('queryString')
const Guid = require('guid')
const UserDB = require('../db/userdb').Users
exports.form = (req, res, err) => {
  if (req.session && req.session.user) {
    console.log('session-cookie maxage = ', req.session.cookie.maxAge)
    console.log('Exist userName = ', req.session.user.userName)
    res.redirect('/chatRelay')
  } else {
    console.log('req.session doesn\'t exist.....')
    res.render('accountKitLogin', {data: {
      appId: process.env.appID,
      csrf: Guid.raw(),
      version: process.env.account_kit_api_version
    }
    })
  }
}

exports.success = (req, res, next) => {
 // CSRF Check
  if (req.body.csrf === 'csrf') { // GUID.raw()) {
    console.log('<routes/accountKitLogin.js exports.success > req.body.csrf === \'csrf\' ')
    let appAccessToken = ['AA', process.env.appID, process.env.appSecret].join('|')
    let params = {
      grant_type: 'authorization_code',
      code: req.body.code,
      access_token: appAccessToken
    }
    // exchange tokens
    let tokenExchangeUrl = process.env.token_exchange_base_url + '?' + Querystring.stringify(params)
    Request.get({url: tokenExchangeUrl, json: true}, function (err, resp, respBody) {
      console.log('<accountKitLogin.js, success > inside tokenExchangeUrl respBody -> ', respBody)
      if (err) throw new Error(err)
      let view = {
        user_access_token: respBody.access_token,
        expires_at: respBody.expires_at,
        user_id: respBody.id
      }
      console.log('<accountKitLogin.js, success > view -> ', view)
      // get account details at /me endpoint
      let meEndpointUrl = process.env.me_endpoint_base_url + '?access_token=' + respBody.access_token
      Request.get({ url: meEndpointUrl, json: true }, function (err, resp, respBody) {
        console.log('<accountKitLogin.js, success > inside meEndpointUrl respBody -> ', respBody)
        // send login_success.html
        if (err) throw new Error(err)
        if (respBody.phone) {
          view.phone_num = respBody.phone.number
          checkForPhoneNumberAndRedirect(view.phone_num, req, res, next)
        }
      })
    })
  } else {
   // login failed
   console.log('<routes/accountKitLogin.js exports.success > req.body.csrf !== \'csrf\'  LOGIN FAILED ')
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.end('Something went wrong. :( ')
  }
}

const checkForPhoneNumberAndRedirect = (phoneNumber, req, res, next) => {
  UserDB.findByPhoneNumber(phoneNumber, (err, user) => {
    console.log('user from db ->', user)
    if (err) return next(err)
    console.log('user->', user)
    if (user === undefined) {
      console.log('<accountKitLogin.js checkForPhoneNumberAndRedirect > User is undefined')
      return res.render('newUser', {phoneNumber: phoneNumber})
    }
    req.session.user = user
    let hour = 86400000
    req.session.cookie.expires = new Date(Date.now() + hour)
    req.session.cookie.maxAge = hour
    return res.redirect('/chatRelay')
  })
}
