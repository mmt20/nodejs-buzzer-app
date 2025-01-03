const express = require("express");
const { v4: uuidv4 } = require("uuid");

const path = require("path");
const connection = require("../connection");
require("dotenv").config();
const auth = require("../services/authentication");
const checkRole = require("../services/checkRole");

const multer = require("multer");
const router = express.Router();

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/category/"));
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `category-${uuidv4()}-${Date.now()}` + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

// Add category
router.post(
  "/add",
  auth.authenticateToken,
  checkRole.checkRole,
  upload.single("image"),
  (req, res) => {
    const { name } = req.body;
    const image = req.file ? `/uploads/category/${req.file.filename}` : null;

    const query = "INSERT INTO category (name, image) VALUES (?, ?)";
    connection.query(query, [name, image], (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database Error" });
      }
      return res.status(201).json({
        message: "Category created successfully",
        category: { id: results.insertId, name, image },
      });
    });
  }
);

// Get all categories
router.get("/getAll", (req, res, next) => {
  const query = "SELECT * FROM category ORDER BY name";
  connection.query(query, (err, results) => {
    if (!err) {
      return res.status(200).json(results);
    } else {
      return res.status(500).json({ message: "Database Error" });
    }
  });
});

// Update category
router.patch(
  "/update/:id",
  auth.authenticateToken,
  checkRole.checkRole,
  upload.single("image"),
  (req, res, next) => {
    const { id } = req.params;
    const { name } = req.body;
    const image = req.file ? `/uploads/categories/${req.file.filename}` : null;

    if (!name) {
      return res.status(400).json({ message: "ID and name are required" });
    }

    const query = image
      ? "UPDATE category SET name = ?, image = ? WHERE id = ?"
      : "UPDATE category SET name = ? WHERE id = ?";
    const values = image ? [name, image, id] : [name, id];

    connection.query(query, values, (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database Error" });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      return res.status(200).json({ message: "Category updated successfully" });
    });
  }
);

router.delete(
  "/delete/:id",
  auth.authenticateToken,
  checkRole.checkRole,
  (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "ID is required" });
    }

    const query = "DELETE FROM category WHERE id = ?";
    connection.query(query, [id], (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database Error" });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      return res.status(200).json({ message: "Category deleted successfully" });
    });
  }
);

module.exports = router;
