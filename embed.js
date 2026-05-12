const axios = require('axios');
const jws = require('jws');
const { ACCESS_TOKEN_URL, EMBED_TOKEN_URL, EMBED_URL } = require('./constants');
const db = require('./models/database');

function secondsSinceEpoch() {
  return Math.floor(Date.now() / 1000);
}

function convertToLocalTimestamp(secondsSinceEpoch) {
  return new Date(secondsSinceEpoch * 1000).toLocaleString();
}

/**
 * Gets a valid access token, using the DB cache or fetching a new one.
 * @param {Object} config - { clientId, clientSecret }
 * @returns {Promise<string>} access token
 */
async function getAccessToken(config) {
  const cacheKey = `access:${config.clientId}`;
  const cached = db.getTokenCache(cacheKey);
  const now = secondsSinceEpoch();

  if (cached && cached.access_token && cached.access_token_expiration > now) {
    console.log(`Access token valid for ${cached.access_token_expiration - now}s`);
    return cached.access_token;
  }

  console.log('Fetching new access token...');
  const response = await axios.get(ACCESS_TOKEN_URL, {
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(config.clientId + ':' + config.clientSecret).toString('base64'),
    },
  });

  const data = response.data;
  const expiration = now + (data.expires_in - 60);

  db.setTokenCache(cacheKey, {
    accessToken: data.access_token,
    accessTokenExpiration: expiration,
    userId: data.userId,
  });

  console.log(`Access token created: valid until ${convertToLocalTimestamp(expiration)}`);
  return data.access_token;
}

async function getEmbedToken(config) {
  const filterHash = Buffer.from(JSON.stringify(config.filters || [])).toString('base64').slice(0, 16);
  const cacheKey = `embed:${config.clientId}:${config.embedId}:${filterHash}`;
  
  const cached = db.getTokenCache(cacheKey);
  const now = secondsSinceEpoch();

  if (cached && cached.embedToken && cached.embedTokenExpiration > now) {
    console.log('Using cached embed token for these filters');
    return cached.embedToken;
  }

  console.log('Creating new embed token with secure filters...');
  const accessToken = await getAccessToken(config);

  const domoFilters = (config.filters || []).map(f => ({
    column: f.column,
    operator: (f.operator || 'IN').replace(/ /g, '_'),
    values: f.values
  }));

  const response = await axios.post(
    EMBED_TOKEN_URL,
    {
      sessionLength: 1440,
      authorizations: [
        {
          token: config.embedId,
          entity: 'PAGE', 
          permissions: ['READ', 'FILTER'],
          filters: domoFilters, 
          policies: [],
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.data.error) {
    throw new Error(response.data.error);
  }

  const embedToken = response.data.authentication;
  const decoded = jws.decode(embedToken);

  const expiration = decoded.payload.exp - 60;
  db.setTokenCache(cacheKey, {
    embedToken,
    embedTokenExpiration: expiration,
  });

  return embedToken;
}

/**
 * Main handler: returns embed token + URL as JSON (React-friendly).
 */
async function handleEmbedRequest(config) {
  const embedToken = await getEmbedToken(config);
  return {
    embedToken,
    embedUrl: `${EMBED_URL}${config.embedId}`,
  };
}

module.exports = { handleEmbedRequest }; 