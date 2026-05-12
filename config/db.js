const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  connectTimeout: 60000,
});

pool.getConnection()
  .then((connection) => {
    console.log("✅ MySQL Connected");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ MySQL Connection Failed:", err);
  });

module.exports = pool;