const express = require('express')
const app = express()
const http = require('http').Server(app)
const path = require('path')
const bodyParser = require('body-parser')
const session = require('express-session')({
  secret: 'my-secret',
  resave: true,
  saveUninitialized: true
})
const Guid = require('guid')

const chat = require('./routes/chat')
const accountKitLogin = require('./routes/accountKitLogin')


const newUser = require('./routes/newUser')
const appInfo = {}
// if (process.env.NODE_ENV === 'development') {
//   appInfo = require('./config/app_config.json')
// }

appInfo.account_kit_api_version = process.env.account_kit_api_version
appInfo.appID = process.env.appID
appInfo.appSecret = process.env.appSecret
appInfo.me_endpoint_base_url = process.env.me_endpoint_base_url
appInfo.token_exchange_base_url = process.env.token_exchange_base_url
appInfo.NODE_ENV = process.env.NODE_ENV

console.log('appInfo --> ', appInfo)
// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// Looks for external JS file holding front-end logic
app.use(express.static(path.join(__dirname, '/public')))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(session)
/* Account Kit related */

appInfo.csrf_guid = Guid.raw()
app.get('/chatRelay', chat.ui)
app.get('/', accountKitLogin.form)
app.post('/loginSucess', accountKitLogin.success)
app.post('/newUser', newUser.save)
http.listen(3000, () => {
  console.log('Server is listening at * 3000')
})

const socket = require('./lib/chat_server')
socket.listen(http, session)
