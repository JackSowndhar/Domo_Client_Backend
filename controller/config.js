const db = require('../models/database');

function getConfigsForUser(req, res) {
  res.json(db.getAllEmbedConfigsForUser(req.user.id));
}

function upsertConfig(req, res) {
  const { embedId, clientId, clientSecret, filters, policies } = req.body;
  db.upsertEmbedConfig(req.params.userId, req.params.visualizationKey, {
    embedId, clientId, clientSecret, filters, policies,
  });
  db.logAudit(
    req.user.id,
    'UPDATE_CONFIG',
    { userId: req.params.userId, visualizationKey: req.params.visualizationKey },
    req.ip
  );
  res.json({ message: 'Config updated' });
}

async function savePolicies(req, res, next) {
  try {
    const { userId, embedId, rules } = req.body;
    if (!userId || !embedId || !Array.isArray(rules)) {
      return res.status(400).json({ error: 'userId, embedId and rules[] required' });
    }
 
    // look up dashboard by embed_id
    const [rows] = await db.pool.execute(
      'SELECT id FROM dashboards WHERE embed_id = ?', [embedId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Dashboard not found' });
 
    await db.savePdp(userId, rows[0].id, rules);
    res.json({ message: 'Policies saved' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getConfigsForUser, upsertConfig, savePolicies };