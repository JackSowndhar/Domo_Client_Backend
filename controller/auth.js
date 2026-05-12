const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

async function signup(req, res) {
  console.log("REQ BODY:", req.body);

  try {
    const { username, password, email } = req.body;
    const userId = await db.createUser({ username, password, email });
    const user = await db.findUserById(userId);
    const token = generateToken(user);
    await db.logAudit(user.id, 'SIGNUP', { username }, req.ip);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Signup FULL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    const user = await db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    const token = generateToken(user);
    await db.logAudit(user.id, 'LOGIN', { username: user.username }, req.ip);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function logout(req, res) {
  try {
    if (req.user) {
      await db.logAudit(
        req.user.id,
        'LOGOUT',
        { username: req.user.username },
        req.ip
      );
    }

    // JWT → logout handled on frontend (delete token)
    res.json({ message: 'Logged out (clear token on client)' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function me(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const user = await db.findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  login,
  logout,
  signup,
  me,
};