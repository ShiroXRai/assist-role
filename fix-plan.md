# Fix Plan for Column Visibility Issue

## Current Issues:

1. The `/api/columns/:table/:role` endpoint doesn't properly implement role-based visibility
2. Column visibility settings are not being properly retrieved and applied
3. The `updateColumnVisibility` function doesn't handle existing entries

## Required Changes:

1. Update `/api/columns/:table/:role` endpoint in `app.js`:

```javascript
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
        ? visibilityResult.recordset[0].hidden_columns.split(",")
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
```

2. Update the column visibility endpoint to handle updates:

```javascript
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
```

3. Update `table-viewer.html` to properly handle visibility:

```javascript
async function fetchColumns() {
  if (!userRole || !tableName) {
    document.getElementById("columnsBody").innerHTML =
      '<tr><td colspan="3">Please select a role and table.</td></tr>';
    return;
  }

  try {
    // Fetch columns with visibility
    const response = await fetch(`/api/columns/${tableName}/${userRole}`);
    const columns = await response.json();

    // Get current visibility settings
    const visibilityResponse = await fetch(
      `/api/column-visibility/${userRole}/${tableName}`
    );
    const hiddenColumns = await visibilityResponse.json();

    const tbody = document.getElementById("columnsBody");
    tbody.innerHTML = "";

    columns.forEach((col) => {
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.textContent = col.COLUMN_NAME;
      row.appendChild(nameCell);

      const typeCell = document.createElement("td");
      typeCell.textContent = col.DATA_TYPE;
      row.appendChild(typeCell);

      const visibilityCell = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !hiddenColumns.includes(col.COLUMN_NAME);
      checkbox.onchange = () =>
        updateColumnVisibility(col.COLUMN_NAME, checkbox.checked);
      visibilityCell.appendChild(checkbox);
      row.appendChild(visibilityCell);

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Error fetching columns:", error);
    document.getElementById("columnsBody").innerHTML = `
      <tr>
        <td colspan="3" style="color: red;">Error loading columns: ${error.message}</td>
      </tr>
    `;
  }
}
```

## Implementation Steps:

1. Update the `/api/columns/:table/:role` endpoint in `app.js`
2. Update the `/api/column-visibility` endpoint in `app.js`
3. Update the JavaScript functions in `table-viewer.html`
4. Test the changes:
   - Select different roles and tables
   - Toggle column visibility
   - Verify persistence of visibility settings

Would you like me to proceed with implementing these changes?
