const { Strategy: LocalStrategy } = require('passport-local');
const bcrypt = require('bcryptjs');
const db = require('../models/database');

function configurePassport(passport) {
  passport.use(
    new LocalStrategy((username, password, done) => {
      const user = db.findUserByUsername(username);
      if (!user) return done(null, false, { message: 'User not found' });
      const valid = bcrypt.compareSync(password, user.password_hash);
      if (!valid) return done(null, false, { message: 'Incorrect password' });
      return done(null, user);
    })
  );

  passport.serializeUser((user, cb) => cb(null, user.id));

  passport.deserializeUser((id, cb) => {
    const user = db.findUserById(id);
    cb(null, user || false);
  });
}

module.exports = { configurePassport };