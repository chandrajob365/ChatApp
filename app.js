const express = require('express')
const app = express()
const http = require('http').Server(app)
// const io = require('socket.io')(http)

const path = require('path')
const bodyParser = require('body-parser')
// var userDetails = []
// var userCount = 0
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

http.listen(3000, () => {
  console.log('Server is listening at * 3000')
})

const socket = require('./lib/chat_server')
socket.listen(http)
