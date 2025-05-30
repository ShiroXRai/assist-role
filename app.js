const express = require("express");
const { poolPromise, sql } = require("./db");
const cors = require("cors");
const app = express();
const port = 3000;
const path = require("path");
app.use(cors());

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json()); // Middleware to parse JSON request bodies

const multer = require("multer");
const fs = require("fs");
const { executeSQL } = require("./db");

// Setup multer for file uploads
const upload = multer({ dest: "uploads/" });

// In-memory store for upload status (can be replaced with DB)
const uploadStatus = {};

// API to get upload status for all jobs
app.get("/api/upload-status", (req, res) => {
  res.json(uploadStatus);
});

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
      res.json([
        { COLUMN_NAME: "CustomerName", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "CustomerAddress", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "CustomerTelephone", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "CustomerType", DATA_TYPE: "nvarchar" },
      ]);
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
      res.json([
        { COLUMN_NAME: "CustomerName", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "CustomerAddress", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "CustomerPhone", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "CustomerType", DATA_TYPE: "nvarchar" },
      ]);
    }
    if (req.params.table == "MachineEnginePopulation") {
      res.json([
        { COLUMN_NAME: "Download", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "CustomerCode", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "CustomerName", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "CustomerAddress", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "CustomerPhone", DATA_TYPE: "nvarchar" },
        { COLUMN_NAME: "CustomerType", DATA_TYPE: "nvarchar" },
      ]);
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
  const { Action, TableName, UserId, RecordId } = req.body;
  try {
    const pool = await poolPromise;
    await pool
      .request()
      .input("Action", sql.NVarChar, Action)
      .input("RecordId", sql.Int, RecordId)
      .input("TableName", sql.NVarChar, TableName)
      .input("UserId", sql.Int, UserId)
      // .input("Timestamp", sql.DateTime, Timestamp)
      .query(
        "INSERT INTO AuditTrial (Action, TableName, RecordId, UserId) VALUES (@Action, @TableName, @RecordId, @UserId)"
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
      .query(
        "SELECT at.*, u.id AS user_id_from_user_table, u.Username FROM AuditTrial at LEFT JOIN [User] u ON at.UserId = u.id ORDER BY at.Timestamp DESC;"
      );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/execute/:jobName", async (req, res) => {
  const jobName = req.params.jobName;
  const uploadedFilePath = path.join(__dirname, "uploads", `${jobName}.xlsx`);
  // return uploadedFilePath;
  if (!fs.existsSync(uploadedFilePath)) {
    return res.status(404).json({ error: "Uploaded file not found" });
  }

  let job_name;
  if (jobName == "ReadDataGPACK") {
    job_name = "Read Data GPACK";
  }

  try {
    const pool = await poolPromise;
    // Start SQL Server Agent job
    await pool
      .request()
      .input("job_name", sql.NVarChar, job_name)
      .execute("msdb.dbo.sp_start_job");

    // Delete uploaded file after starting job
    fs.unlinkSync(uploadedFilePath);

    // Update upload status with sanitized key (remove spaces)
    const sanitizedJobName = jobName.replace(/\s/g, "");
    uploadStatus[sanitizedJobName] = false;

    res.json({
      message: `SQL Server Agent job ${jobName} started successfully and uploaded file deleted.`,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: `Error starting SQL Server Agent job: ${err.message}` });
  }
});

app.post("/api/upload/:jobName", upload.single("file"), (req, res) => {
  const file = req.file;
  const jobName = req.params.jobName;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const sanitizedJobName = jobName.replace(/\s/g, "");
  let finalFileName;
  if (sanitizedJobName == "ReadDataGPACK") {
    finalFileName = "XXONT__Warehouse_Shipping_Repo_.xlsx";
  } else if (sanitizedJobName == "XXPODelivery") {
    finalFileName = "XXPO__PO_Delivery_Report_for_C_.xlsx";
  } else {
    finalFileName = `${sanitizedJobName}.xlsx`;
  }

  // Path utama untuk menyimpan file (di dalam direktori proyek)
  const primaryTargetPath = path.join(__dirname, "uploads", finalFileName);

  // Path kedua untuk menyimpan file
  const secondaryDir = path.join("C:", "Data Gpack"); // Perhatikan: path absolut Windows
  const secondaryTargetPath = path.join(secondaryDir, finalFileName);

  // Langkah 1: Pindahkan file dari lokasi sementara multer ke lokasi utama
  fs.rename(file.path, primaryTargetPath, (renameErr) => {
    if (renameErr) {
      console.error(
        "Error renaming/moving file to primary location:",
        renameErr
      );
      return res
        .status(500)
        .json({ error: "Error saving file to primary location" });
    }

    console.log(`File successfully saved to ${primaryTargetPath}`);

    // Update upload status (jika masih digunakan)
    uploadStatus[sanitizedJobName] = true;

    // Langkah 2: Salin file dari lokasi utama ke lokasi kedua (C:\Data Gpack)
    try {
      // Pastikan direktori kedua ada, jika tidak buat direktorinya
      if (!fs.existsSync(secondaryDir)) {
        fs.mkdirSync(secondaryDir, { recursive: true });
        console.log(`Directory created: ${secondaryDir}`);
      }

      // Salin file
      fs.copyFile(primaryTargetPath, secondaryTargetPath, (copyErr) => {
        if (copyErr) {
          console.error(
            `Error copying file to ${secondaryTargetPath}:`,
            copyErr
          );
          // File berhasil diunggah ke lokasi utama, tetapi gagal disalin ke lokasi kedua
          // Kirim respons yang mengindikasikan ini
          return res.json({
            message: `File uploaded successfully to ${primaryTargetPath} for job ${jobName}, but failed to copy to ${secondaryTargetPath}. Error: ${copyErr.message}`,
            primaryPath: primaryTargetPath,
            secondaryPathAttempted: secondaryTargetPath,
          });
        }

        console.log(`File successfully copied to ${secondaryTargetPath}`);
        res.json({
          message: `File uploaded successfully for job ${jobName} to ${primaryTargetPath} and copied to ${secondaryTargetPath}`,
          primaryPath: primaryTargetPath,
          secondaryPath: secondaryTargetPath,
        });
      });
    } catch (setupErr) {
      // Tangani error jika pembuatan direktori atau persiapan path kedua gagal
      console.error(
        `Error setting up or copying to secondary path ${secondaryTargetPath}:`,
        setupErr
      );
      res.json({
        message: `File uploaded successfully to ${primaryTargetPath} for job ${jobName}, but failed during setup or copy to secondary path. Error: ${setupErr.message}`,
        primaryPath: primaryTargetPath,
        secondaryPathAttempted: secondaryTargetPath,
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
