const express = require("express");
const { poolPromise, sql } = require("./db");
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.json()); // Middleware to parse JSON request bodies

// Get all tables
app.get("/api/tables", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
      );
    res.json(result.recordset.map((item) => item.TABLE_NAME));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get available roles from the roles table
app.get("/api/roles", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT Name FROM Role"); // Assuming the roles table has a column named 'Name'
    res.json(result.recordset.map((item) => item.Name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get columns for a table with role-based visibility
app.get("/api/columns/:table/:role", async (req, res) => {
  try {
    const pool = await poolPromise;

    // First get all columns
    const columnsResult = await pool
      .request()
      .input("tableName", sql.NVarChar, req.params.table)
      .query(
        "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tableName"
      );

    // Then get hidden columns for this role and table
    const visibilityResult = await pool
      .request()
      .input("role", sql.NVarChar, req.params.role)
      .input("table", sql.NVarChar, req.params.table)
      .query(
        "SELECT hidden_columns FROM column_visibility WHERE role = @role AND table_name = @table"
      );

    const hiddenColumns =
      visibilityResult.recordset.length > 0
        ? visibilityResult.recordset[0].hidden_columns
            .split(",")
            .filter((col) => col !== "")
        : [];

    // Filter out hidden columns
    const visibleColumns = columnsResult.recordset.filter(
      (column) => !hiddenColumns.includes(column.COLUMN_NAME)
    );

    res.json(visibleColumns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save column visibility settings
app.post("/api/column-visibility", async (req, res) => {
  const { role, table_name, hidden_columns } = req.body;
  try {
    const pool = await poolPromise;

    // Check if entry exists
    const existingResult = await pool
      .request()
      .input("role", sql.NVarChar, role)
      .input("table_name", sql.NVarChar, table_name)
      .query(
        "SELECT id FROM column_visibility WHERE role = @role AND table_name = @table_name"
      );

    if (existingResult.recordset.length > 0) {
      // Update existing entry
      await pool
        .request()
        .input("role", sql.NVarChar, role)
        .input("table_name", sql.NVarChar, table_name)
        .input("hidden_columns", sql.NVarChar, hidden_columns)
        .query(
          "UPDATE column_visibility SET hidden_columns = @hidden_columns WHERE role = @role AND table_name = @table_name"
        );
    } else {
      // Insert new entry
      await pool
        .request()
        .input("role", sql.NVarChar, role)
        .input("table_name", sql.NVarChar, table_name)
        .input("hidden_columns", sql.NVarChar, hidden_columns)
        .query(
          "INSERT INTO column_visibility (role, table_name, hidden_columns) VALUES (@role, @table_name, @hidden_columns)"
        );
    }

    res.status(200).json({ message: "Column visibility settings saved." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve column visibility settings
app.get("/api/column-visibility/:role/:table", async (req, res) => {
  const { role, table } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("role", sql.NVarChar, role)
      .input("table", sql.NVarChar, table)
      .query(
        "SELECT hidden_columns FROM column_visibility WHERE role = @role AND table_name = @table"
      );
    const hiddenColumns =
      result.recordset.length > 0
        ? result.recordset[0].hidden_columns.split(",")
        : [];
    res.json(hiddenColumns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
