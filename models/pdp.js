const db = require("../config/db");

exports.getPdp = async () => {
  const [rows] = await db.query(`
    SELECT 
      pr.id,
      pr.user_id,
      pr.dashboard_id,
      pr.column_name,
      pr.operator,
      pv.value
    FROM pdp_rules pr
    LEFT JOIN pdp_values pv ON pr.id = pv.rule_id
  `);

  // group values
  const map = {};

  rows.forEach(r => {
    const key = `${r.id}`;
    if (!map[key]) {
      map[key] = {
        user_id: r.user_id,
        dashboard_id: r.dashboard_id,
        column_name: r.column_name,
        operator: r.operator,
        values: []
      };
    }
    if (r.value) map[key].values.push(r.value);
  });

  return Object.values(map);
};

exports.savePdp = async (userId, dashboardId, rules) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // delete old
    const [oldRules] = await conn.query(
      "SELECT id FROM pdp_rules WHERE user_id=? AND dashboard_id=?",
      [userId, dashboardId]
    );

    for (let r of oldRules) {
      await conn.query("DELETE FROM pdp_values WHERE rule_id=?", [r.id]);
    }

    await conn.query(
      "DELETE FROM pdp_rules WHERE user_id=? AND dashboard_id=?",
      [userId, dashboardId]
    );

    // insert new
    for (let r of rules) {
      const [res] = await conn.query(
        "INSERT INTO pdp_rules (user_id, dashboard_id, column_name, operator) VALUES (?, ?, ?, ?)",
        [userId, dashboardId, r.column, r.operator]
      );

      for (let v of r.values) {
        await conn.query(
          "INSERT INTO pdp_values (rule_id, value) VALUES (?, ?)",
          [res.insertId, v]
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
};