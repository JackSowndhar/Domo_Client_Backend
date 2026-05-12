const express = require('express');
const router = express.Router();

const {
  createRequest,
  getMyRequests,
  updateRequest,
  deleteRequest,
  getAllRequests,
  adminDeleteRequest,
} = require('../controller/request');

const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, createRequest);

router.get('/', requireAuth, getMyRequests);

router.put('/:id', requireAuth, updateRequest);

router.delete('/:id', requireAuth, deleteRequest);


router.get('/admin/all', requireAuth, getAllRequests);

router.delete('/admin/:id', requireAuth, adminDeleteRequest);

module.exports = router;