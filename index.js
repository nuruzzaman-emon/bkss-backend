const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
const db = require("./db");
const bcrypt = require("bcrypt");
const initDb = require("./initDb");

app.use(express.json());
app.use(cors());

app.get("/", async (req, res) => {
  res.send("backend created");
});

//For members
app.post("/api/members", async (req, res) => {
  try {
    const { name, email, password, phone, photo_url } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      `INSERT INTO members (name, email, password_hash, photo_url, phone)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, password_hash, photo_url ?? null, phone],
    );

    res.status(201).json({ id: result.insertId, message: "Member created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/social-members", async (req, res) => {
  try {
    const { uid, name, photo_url, email } = req.body;

    // Validate required fields
    if (!uid || !email) {
      return res.status(400).json({
        message: "Firebase UID and email are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for an existing member by Firebase UID or email
    const [existingMembers] = await db.execute(
      `SELECT id, uid, email, status
       FROM members
       WHERE uid = ? OR email = ?
       LIMIT 1`,
      [uid, normalizedEmail],
    );

    if (existingMembers.length > 0) {
      const member = existingMembers[0];

      // Prevent automatic linking of different Firebase accounts
      if (member.uid !== uid) {
        return res.status(409).json({
          message:
            "This email is already registered using another login method.",
        });
      }

      return res.status(200).json({
        message: "Member already exists",
        member: {
          id: member.id,
          status: member.status,
        },
      });
    }

    // Create a new social member
    const [result] = await db.execute(
      `INSERT INTO members
        (uid, name, email, photo_url, role, status)
       VALUES (?, ?, ?, ?, 'member', 'pending')`,
      [uid, name?.trim() || "Unknown User", normalizedEmail, photo_url || null],
    );

    return res.status(201).json({
      message: "Member created successfully",
      member: {
        id: result.insertId,
        status: "pending",
      },
    });
  } catch (err) {
    console.error("Social member error:", err);

    // Handle duplicate UID or email conflicts
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "This account may already be registered. Please try signing in.",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
});

app.get("/api/members/status", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send({ message: "Email is required" });
  }
  try {
    const [rows] = await db.execute(
      `
      SELECT status FROM members WHERE email = ? LIMIT 1
      `,
      [email],
    );
    if (rows.length === 0) {
      return res.status(404).send({ message: "No member found" });
    }
    return res.send({ status: rows[0].status });
  } catch (error) {}
});

app.get("/api/members/role", async (req, res) => {
  const { email } = req.query; // Fix: use req.query

  if (!email) {
    return res.status(400).send({
      message: "Email is required",
    });
  }

  try {
    const [rows] = await db.execute(
      "SELECT role FROM members WHERE email = ? LIMIT 1",
      [email],
    );

    if (rows.length === 0) {
      return res.status(404).send({
        message: "No member found",
      });
    }

    return res.status(200).send({
      role: rows[0].role,
    });
  } catch (error) {
    console.error("Server error from roleChecking:", error);

    return res.status(500).send({
      message: "Internal server error",
    });
  }
});

// For memories
app.post("/api/memories", async (req, res) => {
  try {
    const {
      image_url,
      uploader,
      photo_info,
      uploader_photoURL,
      uploader_email,
    } = req.body;
    const uploaded_at = new Date();

    if (!image_url || !uploader || !uploader_photoURL || !uploader_email) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO memories (image_url, uploader,uploader_email,photo_info,uploader_photoURL, uploaded_at)
       VALUES (?, ?, ?,?,?,?)`,
      [
        image_url,
        uploader,
        uploader_email,
        photo_info,
        uploader_photoURL,
        uploaded_at,
      ],
    );

    res.status(201).json({
      id: result.insertId,
      message: "Image uploaded successfully",
    });
  } catch (err) {
    console.error("MEMORY ERROR:", err);

    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

app.get("/api/memories", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, image_url, uploader,uploaded_at,photo_info,uploader_photoURL FROM memories
      ORDER by uploaded_at DESC`,
    );
    res.status(200).json(rows);
  } catch (err) {
    console.log("Memories Error", err);
    res.status(500).json({
      message: "Failed to fetch memories",
    });
  }
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`App is listening port ${port}`);
    });
  })
  .catch((err) => {
    console.error("DB setup failed", err);
  });
