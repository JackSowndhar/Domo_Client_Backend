const db = require('../models/database');

async function getAuditLog(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const rows = await db.getAuditLog(limit);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAuditLog };