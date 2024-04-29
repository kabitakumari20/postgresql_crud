const pool = require("./src/db/db"); 


const getList = async (req, res) => {
    const client = await pool.connect();
    const result = await client.query("select *  from public.user");
  
    client.release();
  
    res.json({ mag: "OK", count: result.rows.length, result: result.rows });
  
};

const registerUser = async (req, res) => {
  const { firstname, lastname, email, password, contact_no } = req.body;

  try {
    const client = await pool.connect();

    // Define the SQL query to insert a new user
    const sqlQuery = `
            INSERT INTO "User" (firstname, lastname, email, password, contact_no, active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *;
        `;

    // Execute the query with user data
    const result = await client.query(sqlQuery, [
      firstname,
      lastname,
      email,
      password,
      contact_no,
      true,
    ]);

    client.release();

    res.status(201).json(result.rows[0]); // Return the inserted user data
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getList, registerUser };
