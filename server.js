const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const os = require("os");

const app = express();
app.use(cors());
app.use(express.json());
const isProd = process.env.RENDER === "true";   // Render sets this
const PORT = process.env.PORT || 3000;


// local network ip
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

const HOST = isProd ? "0.0.0.0" : getLocalIP();
console.log("📡 Running mode:", isProd ? "RENDER" : "LOCAL");
console.log("📡 Using network IP:", HOST);

// MySQL Connection
const db = mysql.createConnection({
  host: isProd ? process.env.DB_HOST || "localhost" : HOST,
  user: isProd ? process.env.DB_USER || "root" : "root",
  password: isProd ? process.env.DB_PASSWORD || "" : "Ruchika@1004",
  database: isProd ? process.env.DB_NAME || "aegis_db" : "aegis_db",
});

// Auto-Reconnect
function connectDB() {
  db.connect((err) => {
    if (err) {
      console.log("❌ MySQL connection FAILED:", err);
      setTimeout(connectDB, 2000);
    } else {
      console.log("✅ MySQL connected successfully!");
    }
  });
}
connectDB();

// Ensure USERS TABLE exists
db.query(
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(20) UNIQUE,
    password VARCHAR(255)
  )`,
  (err) => {
    if (err) console.log("⚠️ Table creation error:", err);
    else console.log("📁 Users table is ready.");
  }
);

//USER AUTH

// REGISTER USER
app.post("/register", (req, res) => {
  const { name, phone, password } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  db.query(
    "INSERT INTO users (name, phone, password) VALUES (?, ?, ?)",
    [name, phone, password],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "User already exists" });
        }
        return res.status(500).json(err);
      }
      res.json({ message: "User registered successfully", id: result.insertId });
    }
  );
});

// LOGIN USER
app.post("/login", (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  db.query(
    "SELECT * FROM users WHERE phone = ? AND password = ?",
    [phone, password],
    (err, results) => {
      if (err) return res.status(500).json(err);

      if (results.length > 0) {
        res.json({ message: "Login successful", user: results[0] });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    }
  );
});

// CONTACT API (Existing) 

// GET CONTACTS
app.get("/contacts", (req, res) => {
  db.query("SELECT * FROM contacts", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ADD CONTACT
app.post("/contacts", (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Missing fields" });

  db.query(
    "INSERT INTO contacts (name, phone) VALUES (?, ?)",
    [name, phone],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Contact added", id: result.insertId });
    }
  );
});

// DELETE CONTACT
app.delete("/contacts/:id", (req, res) => {
  db.query("DELETE FROM contacts WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Contact deleted" });
  });
});

// START SERVER
app.listen(3000, "0.0.0.0", () => {
  console.log(` Server running at: http://localhost:${PORT}`);
});
