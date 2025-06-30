const { executeSQL } = require("./db");

const createTableQuery = `
CREATE TABLE column_visibility (
    ID INT PRIMARY KEY IDENTITY(1,1),
    RoleId NVARCHAR(50),
    TableName NVARCHAR(50),
    HiddenColumn NVARCHAR(MAX)
);
`;

executeSQL(createTableQuery);
