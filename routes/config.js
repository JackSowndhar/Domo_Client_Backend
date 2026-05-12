const express = require('express');
const router = express.Router();
const { getConfigsForUser, savePolicies } = require('../controller/config');
const { requireAuth } = require('../middleware/auth');

router.get('/',          requireAuth, getConfigsForUser);
router.post('/policies', requireAuth, savePolicies);

module.exports = router;