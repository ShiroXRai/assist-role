const { executeSQL } = require("./db");

const createTableQuery = `
CREATE TABLE column_visibility (
    id INT PRIMARY KEY IDENTITY(1,1),
    role NVARCHAR(50),
    table_name NVARCHAR(50),
    hidden_columns NVARCHAR(MAX)
);
`;

executeSQL(createTableQuery);
