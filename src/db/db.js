const { Pool } = require("pg");

// Configure the connection parameters
const config = {
  user: "postgres",
  password: "1234",
  host: "localhost",
  port: 5432,
  database: "userData",
};

// Create a new pool instance using the configuration
const pool = new Pool(config);

// Add logging to verify database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    console.log("Connected to the database");
    // Release the client to the pool
    release();
  }
});

// Export the pool instance
module.exports = pool;
