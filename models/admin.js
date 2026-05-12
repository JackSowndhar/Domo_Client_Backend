const db = require("../config/db");

exports.getAssignments = async () => {
  const [rows] = await db.query(`
    SELECT 
      u.id AS user_id,
      d.id AS dashboard_id,
      d.embed_id,
      d.name,
      d.color
    FROM user_dashboards ud
    JOIN users u ON u.id = ud.user_id
    JOIN dashboards d ON d.id = ud.dashboard_id
  `);

  return rows;
};

exports.saveAssignments = async (userId, dashboards) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query("DELETE FROM user_dashboards WHERE user_id = ?", [userId]);

    for (let d of dashboards) {
      await conn.query(
        "INSERT INTO user_dashboards (user_id, dashboard_id) VALUES (?, ?)",
        [userId, d.dashboard_id]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};