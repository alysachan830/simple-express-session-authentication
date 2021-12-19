require('dotenv').config()
const express = require('express')
const app = express()
const port = 3000
app.set('view engine', 'ejs')

const redis = require('redis')
var session = require('express-session')

let RedisStore = require('connect-redis')(session)
let redisClient = redis.createClient()

redisClient.on('error', (err) =>
  console.log(`Fail to connect to redis. ${err}`)
)
redisClient.on('connect', () => console.log('Successfully connect to redis'))

const users = [
  { id: 111, username: 'tom', password: '123' },
  { id: 222, username: 'chris', password: '123' },
  { id: 333, username: 'mary', password: '123' },
]

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SECRET, // environment variable
    resave: false,
    saveUninitialized: false,
  })
)

app.get('/', (req, res, next) => {
  if (req.session.isAuth) {
    return res.redirect('/profile')
  }
  const showInputError = req.session.showInputError || false
  // The user hasn't logged in, so it's unnecessary to store his data
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/')
    }
  })
  res.clearCookie('connect.sid')
  res.render('index', { showInputError })
})

// Middleware of parsing URL-encoded form data, for getting username and password
app.use(express.urlencoded({ extended: true }))

app.post('/login', (req, res) => {
  const { username, password } = req.body

  // Prevent empty input
  if (username.trim() === '' || password.trim() === '') {
    req.session.showInputError = true
    return res.redirect('/')
  }

  // Validate input
  const targetUser = users.find(
    (user) => user.username === username && user.password === password
  )

  // Wrong username or password
  if (!targetUser) {
    req.session.showInputError = true
    return res.redirect('/')
  }

  req.session.showInputError = false
  req.session.isAuth = true
  req.session.username = targetUser.username
  req.session.timestamps = []
  res.redirect('/profile')
})

// Middleware function
const checkIsAuthAndAddTimestamp = (req, res, next) => {
  if (req.session.isAuth) {
    req.session.timestamps.push(new Date().getTime())
    next()
  } else {
    res.redirect('/')
  }
}

app.get('/profile', checkIsAuthAndAddTimestamp, (req, res) => {
  const { username, timestamps } = req.session
  res.render('profile', { username, timestamps })
})

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/profile')
    }
  })
  // Default name of cookie set by express-session
  res.clearCookie('connect.sid')
  res.redirect('/')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
