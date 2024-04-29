const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("./src/db/db"); // Import the pool from your database configuration file
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// Define the route to get the list of users
app.get("/users", async (req, res) => {
  const client = await pool.connect();
  const result = await client.query("select *  from public.user");

  client.release();

  res.json({ mag: "OK", count: result.rows.length, result: result.rows });
});

app.post("/register-user1", async (req, res) => {
  try {
    const {
      id,
      firstname,
      lastname,
      email,
      password,
      active,
      created_at,
      contact_no,
    } = req.body;
    const client = await pool.connect();
    const currentDate = new Date().toISOString(); // Get current date in ISO format
    const sqlQuery = `
            INSERT INTO "user" (id, firstname, lastname, email, password, active, created_at, updated_at, contact_no)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
    await client.query(sqlQuery, [
      id,
      firstname,
      lastname,
      email,
      password,
      active,
      currentDate,
      currentDate,
      contact_no,
    ]);
    client.release();
    res.status(201).send("User registered successfully");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/register-user", async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      email,
      password,
      active,
      created_at,
      updated_at,
      contact_no,
    } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await pool.connect();
    const sqlQuery = `
            INSERT INTO "user" (firstname, lastname, email, password, active, created_at, updated_at, contact_no)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
    await client.query(sqlQuery, [
      firstname,
      lastname,
      email,
      hashedPassword,
      active,
      created_at,
      updated_at,
      contact_no,
    ]);
    client.release();
    res.status(201).send("User registered successfully");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const client = await pool.connect();
    const sqlQuery = `
            SELECT * FROM "user"
            WHERE email = $1
        `;
    const result = await client.query(sqlQuery, [email]);
    client.release();
    if (result.rows.length === 0) {
      res.status(401).send("Invalid email or password");
    } else {
      const user = result.rows[0];
      // Compare passwords
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        // Generate token
        const token = jwt.sign({ userId: user.id }, "your_secret_key", {
          expiresIn: "1h",
        });
        res
          .status(200)
          .json({ message: "Login successful", user: user, token: token });
      } else {
        res.status(401).send("Invalid email or password");
      }
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/get-user-by-id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    const sqlQuery = `
            SELECT * FROM "user"
            WHERE id = $1
        `;
    const result = await client.query(sqlQuery, [id]);
    client.release();
    if (result.rows.length === 0) {
      res.status(404).send("User not found");
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/update-user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { firstname, lastname, email, password, active, contact_no } =
      req.body;
    const client = await pool.connect();
    const currentDate = new Date().toISOString(); // Get current date in ISO format
    const sqlQuery = `
            UPDATE "user"
            SET firstname = $1, lastname = $2, email = $3, password = $4, active = $5, updated_at = $6, contact_no = $7
            WHERE id = $8
        `;
    await client.query(sqlQuery, [
      firstname,
      lastname,
      email,
      password,
      active,
      currentDate,
      contact_no,
      id,
    ]);
    client.release();
    res.status(200).send("User updated successfully");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/delete-user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    const sqlQuery = `
            DELETE FROM "user"
            WHERE id = $1
        `;
    await client.query(sqlQuery, [id]);
    client.release();
    res.status(200).send("User deleted successfully");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
