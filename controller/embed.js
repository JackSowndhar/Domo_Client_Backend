const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/database');
const { handleEmbedRequest } = require('../embed');

async function getEmbedByKey(req, res, next) {
  try {
    const config = db.getEmbedConfigForUser(req.user.id, req.params.visualizationKey);

    if (!config) {
      return res.status(404).json({ error: 'Embed configuration not found for this user' });
    }
    if (!config.embed_id || config.embed_id === 'PLACEHOLDER_EMBED_ID') {
      return res.status(400).json({ error: 'EMBED_ID is not configured. Set it in your .env file.' });
    }

    // Special SSO handling for samantha (admin role)
    if (req.user.username === 'samantha' && process.env.JWT_SECRET && process.env.IDP_URL) {
      const jwtBody = {
        sub: req.user.id,
        name: req.user.username,
        email: req.user.email || req.user.username + '@domo.com',
        jti: uuidv4(),
      };
      if (process.env.KEY_ATTRIBUTE && process.env.MAPPING_VALUE) {
        jwtBody[process.env.KEY_ATTRIBUTE] = process.env.MAPPING_VALUE;
      }
      const token = jwt.sign(jwtBody, process.env.JWT_SECRET, { expiresIn: '5m' });
      return res.json({
        ssoUrl: `${process.env.IDP_URL}/jwt?token=${token}`,
        embedUrl: null,
        embedToken: null,
        isSso: true,
      });
    }

    db.logAudit(req.user.id, 'EMBED_REQUEST', { visualizationKey: req.params.visualizationKey }, req.ip);

    const result = await handleEmbedRequest({
      embedId: config.embed_id,
      clientId: config.client_id,
      clientSecret: config.client_secret,
      filters: config.filters,
      policies: config.policies,
      datasetRedirects: config.datasetRedirects,
      sqlFilters: config.sqlFilters,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getTokenByEmbedId(req, res, next) {
  try {
    const { embedId } = req.params;
    if (!embedId || embedId.length < 3) {
      return res.status(400).json({ error: 'Valid embed ID required' });
    }
    const result = await handleEmbedRequest({
      embedId,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      filters: [],
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getEmbedByKey, getTokenByEmbedId };