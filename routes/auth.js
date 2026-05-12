const express = require('express');
const router = express.Router();
const { login, logout, me, signup } = require('../controller/auth');
const { requireAuth } = require('../middleware/auth');

router.post('/login',  login);
router.post('/logout', logout);
router.post('/signup', signup);
router.get('/me',      requireAuth, me);

module.exports = router;