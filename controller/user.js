const embedFile = require('../embed'); // adjust path as needed
const db = require('../models/database');

async function getAllUsers(req, res, next) {
  try {
    const users = await db.getAllUsers();
    res.json(users);
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
    await db.logAudit(req.user.id, 'CREATE_USER', { username }, req.ip);
    res.status(201).json({ id, username, email, role: role || 'user' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { email, role } = req.body;
    await db.updateUser(req.params.id, { email, role });
    await db.logAudit(req.user.id, 'UPDATE_USER', { userId: req.params.id }, req.ip);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    await db.deleteUser(req.params.id);
    await db.logAudit(req.user.id, 'DELETE_USER', { userId: req.params.id }, req.ip);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}


async function getUserDashboards(req, res, next) {
  try {
    const userId = req.user.id;
    const rows = await db.getDashboardsWithPDP(userId);

    const grouped = {};

    rows.forEach(r => {
      if (!grouped[r.dashboard_id]) {
        grouped[r.dashboard_id] = {
          dashboard_id: r.dashboard_id,
          embed_id: r.embed_id,
          name: r.name,
          pdp: []
        };
      }

      if (!r.rule_id) return;

      let rule = grouped[r.dashboard_id].pdp.find(x => x.rule_id === r.rule_id);

      if (!rule) {
        rule = {
          rule_id: r.rule_id,
          column: r.column_name,
          operator: r.operator,
          values: []
        };
        grouped[r.dashboard_id].pdp.push(rule);
      }

      if (r.value !== null) {
        rule.values.push(r.value);
      }
    });

    const dashboards = Object.values(grouped);

    const dashboardsWithTokens = await Promise.all(dashboards.map(async (dash) => {
      try {
        const config = {
          clientId: process.env.DOMO_CLIENT_ID,
          clientSecret: process.env.DOMO_CLIENT_SECRET,
          embedId: dash.embed_id,
          filters: dash.pdp 
        };

        const result = await embedFile.handleEmbedRequest(config);
        
        return {
          ...dash,
          embedToken: result.embedToken
        };
      } catch (err) {
        console.error(`Token generation failed for ${dash.name}:`, err.message);
        return { ...dash, embedToken: null };
      }
    }));

    res.json({ dashboards: dashboardsWithTokens });

  } catch (err) {
    next(err);
  }
}

async function saveUserDashboards(req, res, next) {
  try {
    const { dashboards } = req.body;
    if (!Array.isArray(dashboards)) {
      return res.status(400).json({ error: 'dashboards must be an array' });
    }
    await db.saveUserDashboards(req.params.id, dashboards);
    await db.logAudit(req.user.id, 'SAVE_DASHBOARDS', { userId: req.params.id, count: dashboards.length }, req.ip);
    res.json({ message: 'Saved' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllUsers, createUser, updateUser, deleteUser, getUserDashboards, saveUserDashboards };