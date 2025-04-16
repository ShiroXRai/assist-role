# Plan to Address Column Visibility Issue

## Information Gathered:

- The `table-viewer.html` file contains a dropdown for selecting roles and a table for displaying columns.
- The `fetchColumns` function checks if `userRole` and `tableName` are defined before making the API call.
- The `tables-viewer.html` file fetches the list of tables and provides links to view their columns.
- The issue may stem from the API responses for roles and columns.

## Plan:

1. **Check API Endpoints:**

   - Verify the `/api/roles` endpoint to ensure it returns a list of roles correctly.
   - Verify the `/api/columns/${tableName}/${userRole}` endpoint to ensure it returns the expected column data structure.

2. **Debugging:**

   - Add console logs in the `fetchColumns` function to log the values of `userRole` and `tableName` before making the API call.
   - Log the response from the `/api/columns` endpoint to check if the data is being returned correctly.

3. **Testing:**
   - Test the functionality by selecting different roles and tables to see if the columns are populated correctly.
   - Ensure that the visibility checkboxes work as intended.

## Follow-up Steps:

- Implement any necessary changes based on the findings from the API checks and debugging.
- Confirm with the user if they have any additional requirements or modifications.
