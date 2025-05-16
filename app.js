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
    res.json([
      ...result.recordset
        .filter((item) =>
          [
            "Factory",
            "FactoryContact",
            "DealerContact",
            "Product",
            "MasterCustomer",
            "WarrantyRegistration",
            "CustomerRequest",
            "Quotation",
            "CustomerRequestReport",
            "CustomerRequestCosting",
            "Invoice",
            "WarrantyClaim",
          ].includes(item.TABLE_NAME)
        )
        .map((item) => item.TABLE_NAME),
      "MachineEnginePopulation",
      "ServiceTransaction",
      "ServiceCosting",
      "ServiceAccuracy",
      "General",
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get available roles from the roles table
app.get("/api/roles", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT ID, Name FROM Role"); // Return role_id and Name
    res.json(
      result.recordset.map((item) => ({ id: item.ID, name: item.Name }))
    );
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

    const hiddenColumns = [];

    // Filter out hidden columns
    const visibleColumns = columnsResult.recordset.filter(
      (column) => !hiddenColumns.includes(column.COLUMN_NAME)
    );
    if (req.params.table == "WarrantyRegistration") {
      res.json([
        { COLUMN_NAME: "CustomerName", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "Region", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "Telephone", DATA_TYPE: "bigint" },
        { COLUMN_NAME: "Address", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "KelompokTani", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "Username", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "UserTelephone", DATA_TYPE: "bigint" },
        { COLUMN_NAME: "UserAddress", DATA_TYPE: "nvarchar" },
      ]);
    }
    if (req.params.table == "CustomerRequest") {
      res.json([{ COLUMN_NAME: "CustomerName", DATA_TYPE: "nvarchar" }]);
    }
    if (req.params.table == "CustomerRequestReport") {
      res.json([{ COLUMN_NAME: "CustomerName", DATA_TYPE: "nvarchar" }]);
    }
    if (req.params.table == "Quotation") {
      res.json([{ COLUMN_NAME: "CustomerName", DATA_TYPE: "nvarchar" }]);
    }
    if (req.params.table == "CustomerRequestCosting") {
      res.json([{ COLUMN_NAME: "CustomerName", DATA_TYPE: "nvarchar" }]);
    }

    if (req.params.table == "Invoice") {
      res.json([{ COLUMN_NAME: "CustomerName", DATA_TYPE: "nvarchar" }]);
    }

    if (req.params.table == "WarrantyClaim") {
      res.json([{ COLUMN_NAME: "CustomerName", DATA_TYPE: "nvarchar" }]);
    }
    if (req.params.table == "MachineEnginePopulation") {
      res.json([{ COLUMN_NAME: "Download", DATA_TYPE: "nvarchar" }]);
    }
    if (req.params.table == "ServiceTransaction") {
      res.json([{ COLUMN_NAME: "Download", DATA_TYPE: "nvarchar" }]);
    }
    if (req.params.table == "ServiceCosting") {
      res.json([{ COLUMN_NAME: "Download", DATA_TYPE: "nvarchar" }]);
    }
    if (req.params.table == "ServiceAccuracy") {
      res.json([{ COLUMN_NAME: "Download", DATA_TYPE: "nvarchar" }]);
    }
    if (req.params.table == "General") {
      res.json([{ COLUMN_NAME: "Download", DATA_TYPE: "nvarchar" }]);
    }

    res.json(visibleColumns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save column visibility settings
app.post("/api/column-visibility", async (req, res) => {
  const { RoleId, TableName, HiddenColumn } = req.body;
  try {
    const pool = await poolPromise;

    // Check if entry exists
    const existingResult = await pool
      .request()
      .input("RoleId", sql.Int, RoleId)
      .input("TableName", sql.NVarChar, TableName)
      .query(
        "SELECT ID FROM column_visibility WHERE RoleId = @RoleId AND TableName = @TableName"
      );

    if (existingResult.recordset.length > 0) {
      // Update existing entry
      await pool
        .request()
        .input("RoleId", sql.Int, RoleId)
        .input("TableName", sql.NVarChar, TableName)
        .input("HiddenColumn", sql.NVarChar, HiddenColumn)
        .query(
          "UPDATE column_visibility SET HiddenColumn = @HiddenColumn WHERE RoleId = @RoleId AND TableName = @TableName"
        );
    } else {
      // Insert new entry
      await pool
        .request()
        .input("RoleId", sql.Int, RoleId)
        .input("TableName", sql.NVarChar, TableName)
        .input("HiddenColumn", sql.NVarChar, HiddenColumn)
        .query(
          "INSERT INTO column_visibility (RoleId, TableName, HiddenColumn) VALUES (@RoleId, @TableName, @HiddenColumn)"
        );
    }

    res.status(200).json({ message: "Column visibility settings saved." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve column visibility settings
app.get("/api/column-visibility/:RoleId/:TableName", async (req, res) => {
  const { RoleId, TableName } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("RoleId", sql.Int, RoleId)
      .input("TableName", sql.NVarChar, TableName)
      .query(
        "SELECT HiddenColumn FROM column_visibility WHERE RoleId = @RoleId AND TableName = @TableName"
      );
    // console.log(result);

    const hiddenColumns =
      result.recordset.length > 0
        ? result.recordset[0].HiddenColumn.split(",")
        : [];
    res.json(hiddenColumns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST endpoint to create AuditTrial data
app.post("/api/audittrial", async (req, res) => {
  const { Action, TableName, RecordId, UserId, Timestamp } = req.body;
  try {
    const pool = await poolPromise;
    await pool
      .request()
      .input("Action", sql.NVarChar, Action)
      .input("TableName", sql.NVarChar, TableName)
      .input("UserId", sql.Int, UserId)
      .input("Timestamp", sql.DateTime, Timestamp)
      .query(
        "INSERT INTO AuditTrial (Action, TableName, RecordId, UserId, Timestamp) VALUES (@Action, @TableName, @RecordId, @UserId, @Timestamp)"
      );
    res.status(201).json({ message: "AuditTrial record created." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET endpoint to retrieve AuditTrial data
app.get("/api/audittrial", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query("SELECT * FROM AuditTrial ORDER BY Timestamp DESC");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
