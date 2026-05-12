const db = require('../models/database');

async function getDashboardData(req, res, next) {
  try {
    const [users, catalog, assignmentsMap, pdpMap] = await Promise.all([
      db.getAllUsers(),
      db.getAllDashboards(),
      db.getAllAssignments(),
      db.getAllPdp(),
    ]);

    res.json({ users, catalog, assignments: assignmentsMap, policies: pdpMap });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { username, password, email, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    const id = await db.createUser({ username, password, email, role: role || 'user' });
    await db.logAudit(req.user?.id, 'ADMIN_CREATE_USER', { username }, req.ip);
    res.status(201).json({ id, username, email, role: role || 'user' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    await db.deleteUser(req.params.id);
    await db.logAudit(req.user?.id, 'ADMIN_DELETE_USER', { userId: req.params.id }, req.ip);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}
async function saveAssignments(req, res, next) {
  try {
    const { userId, dashboards } = req.body;
    if (!userId || !Array.isArray(dashboards)) {
      return res.status(400).json({ error: 'userId and dashboards[] required' });
    }
    await db.saveUserDashboards(userId, dashboards);
    await db.logAudit(req.user?.id, 'SAVE_ASSIGNMENTS', { userId, count: dashboards.length }, req.ip);
    res.json({ message: 'Assignments saved' });
  } catch (err) {
    next(err);
  }
}
async function savePdp(req, res, next) {
  try {
    const { userId, dashboardId, rules } = req.body;
    if (!userId || !dashboardId || !Array.isArray(rules)) {
      return res.status(400).json({ error: 'userId, dashboardId and rules[] required' });
    }
    await db.savePdp(userId, dashboardId, rules);
    await db.logAudit(req.user?.id, 'SAVE_PDP', { userId, dashboardId, rulesCount: rules.length }, req.ip);
    res.json({ message: 'PDP saved' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboardData, createUser, deleteUser, saveAssignments, savePdp };