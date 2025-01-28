const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const db = new sqlite3.Database("chat.db");

db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, email TEXT)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, message TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)"
  );
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err)
      return res.json({
        success: false,
        message: "Fehler bei der Registrierung",
      });
    db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hash],
      (err) => {
        if (err)
          return res.json({
            success: false,
            message: "Benutzername bereits vergeben",
          });
        res.json({ success: true, message: "Registrierung erfolgreich" });
      }
    );
  });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user)
      return res.json({ success: false, message: "Benutzer nicht gefunden" });
    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result)
        return res.json({ success: false, message: "Falsches Passwort" });
      res.json({ success: true, message: "Login erfolgreich" });
    });
  });
});

app.get("/api/chat-history", (req, res) => {
  db.all(
    "SELECT user, message FROM messages ORDER BY timestamp ASC",
    (err, rows) => {
      if (err)
        return res.json({
          success: false,
          message: "Fehler beim Laden des Chat-Verlaufs",
        });
      res.json(rows);
    }
  );
});

app.post("/api/update-profile", (req, res) => {
  const { username, newUsername, email } = req.body;
  db.run(
    "UPDATE users SET username = ?, email = ? WHERE username = ?",
    [newUsername, email, username],
    (err) => {
      if (err)
        return res.json({
          success: false,
          message: "Fehler beim Aktualisieren des Profils",
        });
      res.json({ success: true, message: "Profil aktualisiert" });
    }
  );
});

app.get("/api/profile", (req, res) => {
  const { username } = req.query;
  db.get(
    "SELECT username, email FROM users WHERE username = ?",
    [username],
    (err, user) => {
      if (err || !user)
        return res.json({ success: false, message: "Benutzer nicht gefunden" });
      res.json({ success: true, ...user });
    }
  );
});

io.on("connection", (socket) => {
  console.log("Ein Benutzer hat sich verbunden");

  socket.on("chat message", (data) => {
    db.run("INSERT INTO messages (user, message) VALUES (?, ?)", [
      data.user,
      data.message,
    ]);
    io.emit("chat message", data);
  });

  socket.on("disconnect", () => {
    console.log("Ein Benutzer hat sich getrennt");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`Server läuft auf Port ${PORT}`)
);
