const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcryptjs')
const dbName = 'chat.sqlite'
const db = new sqlite3.Database(dbName)

db.serialize(() => {
  const sql = `
  CREATE TABLE IF NOT EXISTS users
  (id integer primary key AUTOINCREMENT, userName, pass, salt)
  `;
  db.run(sql)
})

class Users {
  static all (cb) {
    db.all('SELECT * FROM users', cb)
  }

  static find (name, cb) {
    db.get('SELECT * FROM users WHERE userName = ?', name, cb)
  }

  static create (data, cb) {
    data.salt = bcrypt.genSaltSync(10)
    data.pass = bcrypt.hashSync(data.pass, data.salt)
    console.log('salt-->', data.salt)
    console.log('pass-->', data.pass)
    const sql = 'INSERT INTO users(userName, pass, salt) VALUES (?, ?, ?)'
    db.run(sql, data.name, data.pass, data.salt, cb)

  }

  static delete (id, cb) {
    if (!id) return cb(new Error('Please provide an id'))
    db.run('DELETE FROM users WHERE id = ?', id, cb)
  }
}
module.exports = db
module.exports.Users = Users
