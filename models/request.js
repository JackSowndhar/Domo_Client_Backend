const pool = require('../config/db');

async function createRequest(userId, subject, message, createdAt) {
  const connection = await pool.getConnection();

  try {
    const [result] = await connection.execute(
      `INSERT INTO dashboard_requests
       (user_id, subject, message, created_at)
       VALUES (?, ?, ?, ?)`,
      [userId, subject, message, createdAt]
    );

    return result.insertId;
  } finally {
    connection.release();
  }
}

async function getMyRequests(userId) {
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute(
      `SELECT *
       FROM dashboard_requests
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    return rows;
  } finally {
    connection.release();
  }
}

async function updateRequest(id, userId, subject, message) {
  const connection = await pool.getConnection();

  try {
    await connection.execute(
      `UPDATE dashboard_requests
       SET subject = ?,
           message = ?
       WHERE id = ?
       AND user_id = ?`,
      [subject, message, id, userId]
    );
  } finally {
    connection.release();
  }
}

async function deleteRequest(id, userId) {
  const connection = await pool.getConnection();

  try {
    await connection.execute(
      `DELETE FROM dashboard_requests
       WHERE id = ?
       AND user_id = ?`,
      [id, userId]
    );
  } finally {
    connection.release();
  }
}

async function getAllRequests() {
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute(
      `SELECT
          dr.*,
          u.username,
          u.email
       FROM dashboard_requests dr
       LEFT JOIN users u
         ON dr.user_id = u.id
       ORDER BY dr.created_at DESC`
    );

    return rows;
  } finally {
    connection.release();
  }
}

async function adminDeleteRequest(id) {
  const connection = await pool.getConnection();

  try {
    await connection.execute(
      `DELETE FROM dashboard_requests
       WHERE id = ?`,
      [id]
    );
  } finally {
    connection.release();
  }
}

module.exports = {
  createRequest,
  getMyRequests,
  updateRequest,
  deleteRequest,
  getAllRequests,
  adminDeleteRequest,
};