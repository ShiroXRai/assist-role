const sql = require("mssql");

const config = {
  user: "sa",
  password: "YourStrong!Passw0rd",
  server: "localhost",
  port: 1433,
  database: "assist",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function testConnection() {
  try {
    const pool = await sql.connect(config);
    console.log("Connected to SQL Server successfully!");
    await pool.close();
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

testConnection();
