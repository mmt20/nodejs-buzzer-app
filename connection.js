const mysql = require("mysql2");
require("dotenv").config();

// Setup the connection using environment variables
const connection = mysql.createConnection({
  port: process.env.DB_PORT,
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

connection.connect((err) => {
  if (err) {
    console.error(`Error connecting to the database: ${err.message}`);
    process.exit(1);
  } else {
    console.log(`Database Connected : ${connection.config.host}`);
  }
});

module.exports = connection;
