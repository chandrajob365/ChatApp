const appInfo = require('../config/app_config.json')
const Request = require('request')
const Querystring = require('queryString')
const UserDB = require('../db/userdb').Users
exports.form = (req, res, err) => {
  let view = {
    appId: appInfo.appId,
    csrf: appInfo.csrf_guid,
    version: appInfo.account_kit_api_version
  }
  res.render('accountKitLogin', {data: view})
}

exports.success = (req, res, next) => {
  console.log('<accountKitLogin.js, success > req.body.csrf = ', req.body.csrf, ' appInfo.csrf_guid = ', appInfo.csrf_guid)
 // CSRF Check
  if (req.body.csrf === 'csrf') { // appInfo.csrf_guid) {
    let appAccessToken = ['AA', appInfo.appID, appInfo.appSecret].join('|')
    let params = {
      grant_type: 'authorization_code',
      code: req.body.code,
      access_token: appAccessToken
    }
    // exchange tokens
    let tokenExchangeUrl = appInfo.token_exchange_base_url + '?' + Querystring.stringify(params)
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
      let meEndpointUrl = appInfo.me_endpoint_base_url + '?access_token=' + respBody.access_token
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
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.end('Something went wrong. :( ')
  }
}

const checkForPhoneNumberAndRedirect = (phoneNumber, req, res, next) => {
    UserDB.findByPhoneNumber(phoneNumber, (err, user) => {
      console.log('user from db ->', user)
      if(err) return next(err)
      console.log('user->', user)
      if (user === undefined) {
        console.log('<accountKitLogin.js checkForPhoneNumberAndRedirect > User is undefined')
        return res.render('newUser', {phoneNumber: phoneNumber})
      }
      req.session.user = user
      return res.redirect('/chatRelay')
    })
}

/* exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    if(err) throw err
    res.redirect('/')
  })
} */
