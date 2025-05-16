const { executeSQL } = require("./db");

async function migrate() {
  try {
    // Add new RoleId column
    await executeSQL("ALTER TABLE column_visibility ADD RoleId INT;");

    // Update RoleId by joining with Role table on role name
    await executeSQL(
      "UPDATE cv SET RoleId = r.ID FROM column_visibility cv INNER JOIN Role r ON cv.role = r.Name;"
    );

    // Drop old role column
    await executeSQL("ALTER TABLE column_visibility DROP COLUMN role;");

    // Rename columns
    await executeSQL("EXEC sp_rename 'column_visibility.id', 'ID', 'COLUMN';");
    await executeSQL(
      "EXEC sp_rename 'column_visibility.table_name', 'TableName', 'COLUMN';"
    );
    await executeSQL(
      "EXEC sp_rename 'column_visibility.hidden_columns', 'HiddenColumn', 'COLUMN';"
    );

    // Add foreign key constraint (optional)
    await executeSQL(
      "ALTER TABLE column_visibility ADD CONSTRAINT FK_column_visibility_RoleId FOREIGN KEY (RoleId) REFERENCES Role(ID);"
    );

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

migrate();
