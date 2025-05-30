// -- Migration script to create AuditTrial table

const { executeSQL } = require("./db");

const createTableQuery = `
CREATE TABLE AuditTrial (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Action NVARCHAR(255) NOT NULL,
    TableName NVARCHAR(255) NOT NULL,
    RecordId INT NOT NULL,
    UserId INT NOT NULL,
    Timestamp DATETIME NOT NULL DEFAULT GETDATE()
);
`;

executeSQL(createTableQuery);
