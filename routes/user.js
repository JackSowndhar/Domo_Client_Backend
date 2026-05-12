const express = require('express');
const router = express.Router();
const ctrl = require('../controller/user');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/',                      requireAdmin, ctrl.getAllUsers);
router.post('/',                     requireAdmin, ctrl.createUser);
router.put('/:id',                   requireAdmin, ctrl.updateUser);
router.delete('/:id',                requireAdmin, ctrl.deleteUser);

router.get('/dashboards',       requireAuth,  ctrl.getUserDashboards);
router.post('/:id/dashboards',        ctrl.saveUserDashboards);

module.exports = router;