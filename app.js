const express = require('express')
const app = express()
const http = require('http').Server(app)
const path = require('path')
const bodyParser = require('body-parser')
const register = require('./routes/register')
const login = require('./routes/login')
// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// Looks for external JS file holding front-end logic
app.use(express.static(path.join(__dirname, '/public')))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.render('chat_ui')
})
app.get('/register', register.form)
app.post('/register', register.submit)

app.get('/login', login.form)
app.post('/login', login.submit)

http.listen(3000, () => {
  console.log('Server is listening at * 3000')
})

const socket = require('./lib/chat_server')
socket.listen(http)
