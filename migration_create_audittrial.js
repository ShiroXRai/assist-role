// -- Migration script to create AuditTrial table

const { executeSQL } = require("./db");

const createTableQuery = `
CREATE TABLE AuditTrial (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Action NVARCHAR(255) NOT NULL,
    TableName NVARCHAR(255) NOT NULL,
    RecordId INT NOT NULL,
    UserId INT NOT NULL,
    FileName TEXT NOT NULL,
    Timestamp DATETIME NOT NULL DEFAULT GETDATE()
);
`;

executeSQL(createTableQuery);
// declare @tbl table (Model nvarchar(100), BodySerialNumber nvarchar(255), SarSN nvarchar(255), SarPhoneNumber nvarchar(255), HourMeter nvarchar(20)) insert into @tbl select MODEL, SERIAL, [SIM_NO], [SIM_SERIAL], [OPERATING HOURS(TOTAL)] FROM OPENROWSET('Microsoft.ACE.OLEDB.12.0', 'Excel 12.0; Database=C:\Data Gpack\data_HM.xlsx', [Sheet1$]) update Product set HourMeter =  ISNULL(t1.HourMeter, t2.HourMeter), LastReadHourMeter = GETDATE() from Product p left join @tbl t1 on p.Model like t1.Model+'%' and RIGHT(p.BodySerialNumber, 6)=RIGHT(t1.BodySerialNumber, 6) and p.SarSN=t1.SarSN and p.SarPhoneNumber=t1.SarPhoneNumber left join @tbl t2 on p.Model like t2.Model+'%' and RIGHT(p.BodySerialNumber, 6)=RIGHT(t2.BodySerialNumber, 6)
