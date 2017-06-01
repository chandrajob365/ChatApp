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

const register = require('./routes/register')
const login = require('./routes/login')
const chat = require('./routes/chat')
const accountKitLogin = require('./routes/accountKitLogin')
const appInfo = require('./config/app_config.json')
const newUser = require('./routes/newUser')
// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// Looks for external JS file holding front-end logic
app.use(express.static(path.join(__dirname, '/public')))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session)

/* Account Kit related */

appInfo.csrf_guid = Guid.raw()
/* const account_kit_api_version = appInfo.account_kit_api_version
const app_id = appInfo.app_id
const app_secret = appInfo.appSecret
const me_endpoint_base_url = appInfo.me_endpoint_base_url
const token_exchange_base_url = appInfo.token_exchange_base_url */

app.get('/', (req, res, next) => {
  res.render('index', {title: 'Welcome to chat app , Login / Register to continue'})
})
app.get('/chatRelay', chat.ui)

app.get('/register', register.form)
app.post('/register', register.submit)

/* app.get('/login', login.form)
app.post('/login', login.submit)
app.get('/logout', login.logout) */
app.get('/login', accountKitLogin.form)
app.get('/logout', accountKitLogin.logout)
app.post('/loginSucess', accountKitLogin.success)
app.post('/newUser', newUser.save)
http.listen(3000, () => {
  console.log('Server is listening at * 3000')
})

const socket = require('./lib/chat_server')
socket.listen(http, session)
