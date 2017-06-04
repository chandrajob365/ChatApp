const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcryptjs')
const dbName = 'chat.sqlite'
const db = new sqlite3.Database(dbName)
db.serialize(() => {
  const sql = `
  CREATE TABLE IF NOT EXISTS users
  (id integer primary key AUTOINCREMENT, phoneNumber, userName)
  `;
  db.run(sql)
})

class Users {
  static all (cb) {
    db.all('SELECT * FROM users', cb)
  }

  static find (data, cb) {
    if (data) {
      db.get('SELECT * FROM users WHERE userName = ?', data.name, cb)
    }
  }

  static findByPhoneNumber (phoneNumber, cb) {
    if (phoneNumber) {
      db.get('SELECT * FROM users WHERE phoneNumber = ?', phoneNumber, cb)
    }
  }

  static insert (data, cb) {
    const sql = 'INSERT INTO users(phoneNumber, userName) VALUES (?, ?)'
    db.run(sql, data.phoneNumber, data.name, cb)

  }
}
module.exports = db
module.exports.Users = Users
