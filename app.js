const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const db = require('./models/database');
const { configurePassport } = require('./config/passport');

const authRoutes = require('./routes/auth');
const embedRoutes = require('./routes/embed');
const userRoutes = require('./routes/user');
const configRoutes = require('./routes/config');
const auditRoutes = require('./routes/audit');
const adminRoutes = require('./routes/admin');
const requestRoutes = require('./routes/request');

const app = express();

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboard-cat-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
configurePassport(passport);

app.use('/api/auth',    authRoutes);
app.use('/api/embed',   embedRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/configs', configRoutes);
app.use('/api/audit',   auditRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/requests', requestRoutes);

app.use((err, req, res, next) => {
  console.error('Server error:', err.message || err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

db.initDb().catch(err => {
  console.error('❌ DB init failed:', err.message);
  process.exit(1);
});

module.exports = app;