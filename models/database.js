const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// ── Pool ──────────────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || '8888',
  database:         process.env.DB_NAME     || 'domo_embed',
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
});

// ── Schema ────────────────────────────────────────────────────────────────────
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      username     VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email        VARCHAR(255),
      role         VARCHAR(50) DEFAULT 'user',
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // dashboards catalog  (replaces hard-coded INITIAL_DB.catalog)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dashboards (
      id       INT AUTO_INCREMENT PRIMARY KEY,
      embed_id VARCHAR(255) UNIQUE NOT NULL,
      name     VARCHAR(255) NOT NULL,
      color    VARCHAR(20)  DEFAULT '#8b6f47',
      created_at TIMESTAMP  DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // which dashboards a user can see
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_dashboards (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      user_id      INT NOT NULL,
      dashboard_id INT NOT NULL,
      UNIQUE KEY uniq_ud (user_id, dashboard_id),
      FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
      FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE
    )
  `);

  // PDP (row-level security) rules
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pdp_rules (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      user_id      INT NOT NULL,
      dashboard_id INT NOT NULL,
      column_name  VARCHAR(255) NOT NULL,
      operator     VARCHAR(50)  NOT NULL,
      FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
      FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pdp_values (
      id      INT AUTO_INCREMENT PRIMARY KEY,
      rule_id INT NOT NULL,
      value   TEXT NOT NULL,
      FOREIGN KEY (rule_id) REFERENCES pdp_rules(id) ON DELETE CASCADE
    )
  `);

  // embed token cache
  await pool.query(`
    CREATE TABLE IF NOT EXISTS token_cache (
      id                     INT AUTO_INCREMENT PRIMARY KEY,
      cache_key              VARCHAR(255) UNIQUE NOT NULL,
      access_token           TEXT,
      access_token_expiration BIGINT,
      embed_token            TEXT,
      embed_token_expiration  BIGINT,
      user_id_domo           VARCHAR(255),
      updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT,
      action     VARCHAR(255) NOT NULL,
      details    JSON,
      ip_address VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await seedData();
  console.log('✅ MySQL Database initialized');
}

// ── Seed ──────────────────────────────────────────────────────────────────────
async function seedData() {
  const defaultUsers = [
    { username: 'ajay',    password: 'password', role: 'admin', email: 'ajay@company.com'    },
    { username: 'mike',     password: 'password', role: 'user', email: 'mike@company.com'     },
    { username: 'tom',      password: 'password', role: 'user', email: 'tom@company.com'      },
    { username: 'rachael',  password: 'password', role: 'user', email: 'rachael@company.com'  },
  ];

  for (const u of defaultUsers) {
    const hash = bcrypt.hashSync(u.password, 10);
    await pool.execute(
      `INSERT IGNORE INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)`,
      [u.username, hash, u.email, u.role]
    );
  }

  // seed catalog dashboards
  const catalog = [
    { embed_id: 'gp32k', name: 'Media Plan',                      color: '#8b6f47' },
    { embed_id: 'NO3xD', name: 'Snowflake',                        color: '#4a6741' },
    { embed_id: 'VvE7X', name: 'Digital Campaign',                  color: '#7a5c8a' },
    { embed_id: 'VvWP5', name: 'Product Performance Analysis',      color: '#b05a3a' },
    { embed_id: 'BPGKn', name: 'Auto',                              color: '#3a6b7a' },
    { embed_id: 'EXsUM', name: 'Executive Summary',                 color: '#8a7a3a' },
    { embed_id: 'CUAcq', name: 'Customer Acquisition Analysis',     color: '#6a3a6b' },
    { embed_id: 'CONv1', name: 'Conversion Analysis',               color: '#4a6741' },
    { embed_id: 'MKTi1', name: 'Market Intelligence Analysis',      color: '#8b6f47' },
    { embed_id: 'CUSTr', name: 'Customer Retention Analysis',       color: '#3a6b7a' },
  ];

  for (const d of catalog) {
    await pool.execute(
      `INSERT IGNORE INTO dashboards (embed_id, name, color) VALUES (?, ?, ?)`,
      [d.embed_id, d.name, d.color]
    );
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function findUserByUsername(username) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function getAllUsers() {
  const [rows] = await pool.execute(
    'SELECT id, username, password_hash, email, role, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}

async function createUser({ username, password, email, role }) {
  if (!password) throw new Error('Password is required');
  const hash = bcrypt.hashSync(password, 10);
  const [result] = await pool.execute(
    'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
    [username, hash, email || null, role]
  );
  return result.insertId;
}

async function updateUser(id, { email, role }) {
  await pool.execute(
    'UPDATE users SET email = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [email || null, role, id]
  );
}

async function deleteUser(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute('DELETE FROM user_dashboards WHERE user_id = ?', [id]);
    await conn.execute('DELETE FROM audit_log WHERE user_id = ?', [id]);

    await conn.execute('DELETE FROM users WHERE id = ?', [id]);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ── Dashboards catalog ────────────────────────────────────────────────────────
async function getAllDashboards() {
  const [rows] = await pool.execute('SELECT * FROM dashboards ORDER BY name');
  return rows;
}

async function createDashboard({ embed_id, name, color = '#8b6f47' }) {
  const [result] = await pool.execute(
    'INSERT INTO dashboards (embed_id, name, color) VALUES (?, ?, ?)',
    [embed_id, name, color]
  );
  return result.insertId;
}

// ── User ↔ Dashboard assignments ─────────────────────────────────────────────
async function getDashboardsForUser(userId) {
  const [rows] = await pool.execute(`
    SELECT d.id AS dashboard_id, d.embed_id, d.name, d.color
    FROM user_dashboards ud
    JOIN dashboards d ON d.id = ud.dashboard_id
    WHERE ud.user_id = ?
    ORDER BY d.name
  `, [userId]);
  return rows;
}

async function getDashboardsWithPDP(userId) {
  const [rows] = await pool.execute(`
    SELECT 
      d.id AS dashboard_id,
      d.embed_id,
      d.name,
      p.id AS rule_id,
      p.column_name,
      p.operator,
      pv.value
    FROM user_dashboards ud
    JOIN dashboards d ON d.id = ud.dashboard_id
    LEFT JOIN pdp_rules p 
      ON p.user_id = ud.user_id AND p.dashboard_id = d.id
    LEFT JOIN pdp_values pv 
      ON pv.rule_id = p.id
    WHERE ud.user_id = ?
  `, [userId]);

  return rows;
}

async function getAllAssignments() {
  const [rows] = await pool.execute(`
    SELECT ud.user_id, d.id AS dashboard_id, d.embed_id, d.name, d.color
    FROM user_dashboards ud
    JOIN dashboards d ON d.id = ud.dashboard_id
  `);
  // return as { userId: [dashboards] }
  const map = {};
  for (const r of rows) {
    if (!map[r.user_id]) map[r.user_id] = [];
    map[r.user_id].push({ dashboard_id: r.dashboard_id, embed_id: r.embed_id, name: r.name, color: r.color });
  }
  return map;
}

async function saveUserDashboards(userId, dashboards) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM user_dashboards WHERE user_id = ?', [userId]);

    for (const d of dashboards) {
      // dashboards may arrive as { dashboard_id } or { embed_id }
      let dashboardId = d.dashboard_id;
      if (!dashboardId && d.embed_id) {
  const cleanEmbedId = d.embed_id.trim().toLowerCase();

  const [rows] = await conn.query(
    'SELECT id FROM dashboards WHERE LOWER(embed_id) = ?',
    [cleanEmbedId]
  );

  if (rows[0]) {
    dashboardId = rows[0].id;
  } else {
    await conn.query(
      'INSERT IGNORE INTO dashboards (embed_id, name, color) VALUES (?, ?, ?)',
      [cleanEmbedId, d.name || cleanEmbedId, d.color || '#8b6f47']
    );

    const [rows2] = await conn.query(
      'SELECT id FROM dashboards WHERE embed_id = ?',
      [cleanEmbedId]
    );

    dashboardId = rows2[0]?.id;
  }
}
      if (dashboardId) {
        await conn.query(
          'INSERT IGNORE INTO user_dashboards (user_id, dashboard_id) VALUES (?, ?)',
          [userId, dashboardId]
        );
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ── PDP rules ─────────────────────────────────────────────────────────────────
async function getPdpForUser(userId) {
  const [rows] = await pool.execute(`
    SELECT pr.id, pr.dashboard_id, pr.column_name, pr.operator, pv.value,
           d.embed_id, d.name AS dashboard_name
    FROM pdp_rules pr
    LEFT JOIN pdp_values pv ON pv.rule_id = pr.id
    JOIN dashboards d ON d.id = pr.dashboard_id
    WHERE pr.user_id = ?
  `, [userId]);

  const map = {};
  for (const r of rows) {
    const key = `${r.id}`;
    if (!map[key]) {
      map[key] = {
        id:             r.id,
        dashboard_id:   r.dashboard_id,
        embed_id:       r.embed_id,
        dashboard_name: r.dashboard_name,
        column_name:    r.column_name,
        operator:       r.operator,
        values:         r.value ? [r.value] : [],
      };
    }
    if (r.value) map[key].values.push(r.value);
  }
  return Object.values(map);
}

async function getAllPdp() {
  const [rows] = await pool.execute(`
    SELECT pr.id, pr.user_id, pr.dashboard_id, pr.column_name, pr.operator, pv.value,
           d.embed_id
    FROM pdp_rules pr
    LEFT JOIN pdp_values pv ON pv.rule_id = pr.id
    JOIN dashboards d ON d.id = pr.dashboard_id
  `);

  const map = {};
  for (const r of rows) {
    const key = `${r.user_id}:${r.embed_id}`;
    if (!map[key]) map[key] = [];
    // find or create rule entry
    let rule = map[key].find(x => x.id === r.id);
    if (!rule) {
      rule = { id: r.id, column: r.column_name, operator: r.operator, values: r.value ? [r.value] : [] };
      map[key].push(rule);
    }
    if (r.value) rule.values.push(r.value);
  }
  return map;
}

async function savePdp(userId, dashboardId, rules) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // delete existing rules for this user+dashboard
    const [oldRules] = await conn.query(
      'SELECT id FROM pdp_rules WHERE user_id = ? AND dashboard_id = ?',
      [userId, dashboardId]
    );
    for (const r of oldRules) {
      await conn.query('DELETE FROM pdp_values WHERE rule_id = ?', [r.id]);
    }
    await conn.query(
      'DELETE FROM pdp_rules WHERE user_id = ? AND dashboard_id = ?',
      [userId, dashboardId]
    );

    // insert new rules
    for (const rule of rules) {
      const [res] = await conn.query(
        'INSERT INTO pdp_rules (user_id, dashboard_id, column_name, operator) VALUES (?, ?, ?, ?)',
        [userId, dashboardId, rule.column, rule.operator]
      );
      for (const v of (rule.values || [])) {
        await conn.query('INSERT INTO pdp_values (rule_id, value) VALUES (?, ?)', [res.insertId, v]);
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ── Token cache ───────────────────────────────────────────────────────────────
async function getTokenCache(cacheKey) {
  const [rows] = await pool.execute('SELECT * FROM token_cache WHERE cache_key = ?', [cacheKey]);
  return rows[0] || null;
}

async function setTokenCache(cacheKey, data) {
  await pool.execute(`
    INSERT INTO token_cache
      (cache_key, access_token, access_token_expiration, embed_token, embed_token_expiration, user_id_domo)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      access_token            = VALUES(access_token),
      access_token_expiration = VALUES(access_token_expiration),
      embed_token             = VALUES(embed_token),
      embed_token_expiration  = VALUES(embed_token_expiration),
      user_id_domo            = VALUES(user_id_domo)
  `, [
    cacheKey,
    data.accessToken            || null,
    data.accessTokenExpiration  || null,
    data.embedToken             || null,
    data.embedTokenExpiration   || null,
    data.userId                 || null,
  ]);
}

// ── Audit log ─────────────────────────────────────────────────────────────────
async function logAudit(userId, action, details, ipAddress) {
  await pool.execute(
    'INSERT INTO audit_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
    [userId || null, action, JSON.stringify(details || {}), ipAddress || null]
  );
}

async function getAuditLog(limit = 100) {
  const [rows] = await pool.execute(`
    SELECT a.*, u.username
    FROM audit_log a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ?
  `, [limit]);
  return rows;
}

// ── Export ────────────────────────────────────────────────────────────────────
module.exports = {
  pool,
  initDb,
  // users
  findUserByUsername,
  findUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  // dashboards
  getAllDashboards,
  createDashboard,
  // assignments
  getDashboardsForUser,
  getDashboardsWithPDP,
  getAllAssignments,
  saveUserDashboards,
  // pdp
  getPdpForUser,
  getAllPdp,
  savePdp,
  // token cache
  getTokenCache,
  setTokenCache,
  // audit
  logAudit,
  getAuditLog,
};