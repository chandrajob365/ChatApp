const express = require('express')
const app = express()
const http = require('http').Server(app)
const path = require('path')
const bodyParser = require('body-parser')
const session = require('express-session')
const register = require('./routes/register')
const login = require('./routes/login')
const chat = require('./routes/chat')
// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// Looks for external JS file holding front-end logic
app.use(express.static(path.join(__dirname, '/public')))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))

app.get('/', (req, res, next) => {
  res.render('index', {title: 'Welcome to chat app , Login / Register to continue'})
})
app.get('/chatRelay', chat.ui)
app.get('/register', register.form)
app.post('/register', register.submit)

app.get('/login', login.form)
app.post('/login', login.submit)
app.get('/logout', login.logout)
http.listen(3000, () => {
  console.log('Server is listening at * 3000')
})

const socket = require('./lib/chat_server')
socket.listen(http)
