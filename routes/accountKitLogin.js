const Request = require('request')
const Querystring = require('querystring')
const Guid = require('guid')
const UserDB = require('../db/userdb').Users
exports.form = (req, res, err) => {
  if (req.session && req.session.user)
    res.redirect('/chatRelay')
  else {
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
  if (req.body.csrf === 'csrf') {
    let appAccessToken = ['AA', process.env.appID, process.env.appSecret].join('|')
    let params = {
      grant_type: 'authorization_code',
      code: req.body.code,
      access_token: appAccessToken
    }
    // exchange tokens
    let tokenExchangeUrl = process.env.token_exchange_base_url + '?' + Querystring.stringify(params)
    Request.get({url: tokenExchangeUrl, json: true}, function (err, resp, respBody) {
      if (err) throw new Error(err)
      let view = {
        user_access_token: respBody.access_token,
        expires_at: respBody.expires_at,
        user_id: respBody.id
      }
      // get account details at /me endpoint
      let meEndpointUrl = process.env.me_endpoint_base_url + '?access_token=' + respBody.access_token
      Request.get({ url: meEndpointUrl, json: true }, function (err, resp, respBody) {
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
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.end('Something went wrong. :( ')
  }
}

const checkForPhoneNumberAndRedirect = (phoneNumber, req, res, next) => {
  UserDB.findByPhoneNumber(phoneNumber, (err, user) => {
    if (err) return next(err)
    if (user === undefined)
      return res.render('newUser', {phoneNumber: phoneNumber})
    req.session.user = user
    let hour = 86400000
    req.session.cookie.expires = new Date(Date.now() + hour)
    req.session.cookie.maxAge = hour
    return res.redirect('/chatRelay')
  })
}
