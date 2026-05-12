const express = require('express');
const router = express.Router();
const ctrl = require('../controller/admin');
const { requireAdmin } = require('../middleware/auth');

router.get('/data',          ctrl.getDashboardData);
router.post('/users',        ctrl.createUser);
router.delete('/user/:id',   ctrl.deleteUser);
router.post('/assignments', ctrl.saveAssignments);
router.post('/pdp',         requireAdmin, ctrl.savePdp);

module.exports = router;