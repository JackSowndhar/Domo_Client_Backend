const express = require('express');
const router = express.Router();
const { getAuditLog } = require('../controller/audit');
const { requireAdmin } = require('../middleware/auth');

router.get('/', requireAdmin, getAuditLog);

module.exports = router;