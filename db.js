const sql = require("mssql");

const config = {
  user: "sa",
  password: "12345",
  server: "localhost",
  port: 1433,
  database: "assist",
  options: {
    encrypt: false, // For Azure
    trustServerCertificate: true, // For self-signed certificates
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("Connected to SQL Server");
    return pool;
  })
  .catch((err) => {
    console.log("Database Connection Failed!", err);
    process.exit(1);
  });

// Function to execute a SQL command
async function executeSQL(query) {
  try {
    const pool = await poolPromise;
    await pool.request().query(query);
    console.log("SQL command executed successfully");
  } catch (err) {
    console.error("Error executing SQL command:", err);
  }
}

module.exports = {
  sql,
  poolPromise,
  executeSQL,
};
