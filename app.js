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


const chat = require('./routes/chat')
const accountKitLogin = require('./routes/accountKitLogin')


const newUser = require('./routes/newUser')

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

app.get('/chatRelay', chat.ui)
app.get('/', accountKitLogin.form)
app.post('/loginSucess', accountKitLogin.success)
app.post('/newUser', newUser.save)
app.get('/logout', chat.logout)
let server_port = process.env.PORT
http.listen(server_port, () => {
   console.log('Server is listening at * ', server_port)
 })
const socket = require('./lib/chat_server')
socket.listen(http, session)
