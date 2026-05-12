const express = require('express');
const router = express.Router();
const { getEmbedByKey, getTokenByEmbedId } = require('../controller/embed');
const { requireAuth } = require('../middleware/auth');

// NOTE: /token/:embedId must come BEFORE /:visualizationKey or express will match 'token' as a key
router.get('/token/:embedId',      requireAuth, getTokenByEmbedId);
router.get('/:visualizationKey',   requireAuth, getEmbedByKey);

module.exports = router;