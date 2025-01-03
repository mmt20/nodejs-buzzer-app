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
    cb(null, path.join(__dirname, "../uploads/product/"));
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `product-${uuidv4()}-${Date.now()}` + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

// Add product
router.post(
  "/add",
  auth.authenticateToken,
  checkRole.checkRole,
  upload.single("image"),
  (req, res) => {
    const { name, categoryId, description, price, status } = req.body;
    const image = req.file ? `/uploads/product/${req.file.filename}` : null;

    if (!name || !categoryId || !description || !price) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const query =
      "INSERT INTO product (categoryId, name, image, description, price, status) VALUES (?, ?, ?, ?, ?, true)";

    connection.query(
      query,
      [categoryId, name, image, description, price, status || "true"],
      (err, results) => {
        if (err) {
          return res.status(500).json({ message: "Database Error" });
        }
        return res.status(201).json({
          message: "Product created successfully",
          product: {
            id: results.insertId,
            categoryId,
            name,
            image,
            description,
            price,
            status: status || "true",
          },
        });
      }
    );
  }
);

// Get all products or filter by category with pagination and search
router.get("/getAll", (req, res) => {
  const { categoryId, keyword, page = 1, limit = 10 } = req.query;

  const offset = (page - 1) * limit;

  let dataQuery = `
    SELECT p.id, p.name ,p.description , p.image, p.price , c.name AS category
    FROM product p
    INNER JOIN category c ON p.categoryId = c.id
  `;
  let queryParams = [];

  // Apply category
  if (categoryId) {
    dataQuery += " WHERE p.categoryId = ?";
    queryParams.push(categoryId);
  }

  // Apply search filter
  if (keyword) {
    if (categoryId) {
      dataQuery += " AND (p.name LIKE ? OR p.description LIKE ?)";
    } else {
      dataQuery += " WHERE (p.name LIKE ? OR p.description LIKE ?)";
    }
    queryParams.push(`%${keyword}%`, `%${keyword}%`);
  }

  // Add pagination
  dataQuery += " LIMIT ? OFFSET ?";
  queryParams.push(parseInt(limit), parseInt(offset));

  let countQuery = `
    SELECT COUNT(*) AS totalDocuments
    FROM product p
    INNER JOIN category c ON p.categoryId = c.id
  `;
  let countParams = [...queryParams.slice(0, -2)];

  // total number of documents
  connection.query(countQuery, countParams, (countErr, countResults) => {
    if (countErr) {
      return res.status(500).json({ message: "Database Error" });
    }

    const totalDocuments = countResults[0].totalDocuments;

    //  fetch paginated results
    connection.query(dataQuery, queryParams, (dataErr, results) => {
      if (dataErr) {
        return res.status(500).json({ message: "Database Error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "No products found" });
      }

      const paginationResult = {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        numberOfPages: Math.ceil(totalDocuments / limit),
      };

      if (page < paginationResult.numberOfPages) {
        paginationResult.next = parseInt(page) + 1;
      }
      if (page > 1) {
        paginationResult.prev = parseInt(page) - 1;
      }

      res.status(200).json({
        results: results.length,
        paginationResult,
        data: results,
      });
    });
  });
});

// get products by category
router.get("/getByCategory/:id", (req, res) => {
  const id = req.params.id;

  const query =
    "SELECT id, name,description,image,price  FROM product WHERE categoryId = ?";

  connection.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database Error", error: err });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for this category" });
    }

    return res.status(200).json({
      status: "true",
      data: results,
    });
  });
});

// get product by id
router.get("/getById/:id", (req, res) => {
  const id = req.params.id;

  const query = `
  SELECT p.id, p.name, p.description, p.price, p.image, c.name AS category
  FROM product p
  INNER JOIN category c ON p.categoryId = c.id
  WHERE p.id = ?`;

  connection.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database Error", error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json(results[0]);
  });
});

// update product by id
router.patch(
  "/update/:id",
  auth.authenticateToken,
  checkRole.checkRole,
  upload.single("image"),
  (req, res) => {
    const productId = req.params.id;
    const updatedProduct = req.body;
    const image = req.file ? `/uploads/product/${req.file.filename}` : null;

    if (Object.keys(updatedProduct).length === 0 && !image) {
      return res.status(400).json({ message: "No data provided to update" });
    }

    let query = "UPDATE product SET ";
    let queryParams = [];

    if (image) {
      query += "image = ?";
      queryParams.push(image);
    }

    // Dynamically append other fields to the query
    Object.keys(updatedProduct).forEach((key, index) => {
      if (key !== "image") {
        query += `${key} = ?`;
        queryParams.push(updatedProduct[key]);
        if (index < Object.keys(updatedProduct).length - 1) {
          query += ", ";
        }
      }
    });

    query += " WHERE id = ?";
    queryParams.push(productId);

    connection.query(query, queryParams, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database Error", details: err });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      return res.status(200).json({ message: "Product updated successfully" });
    });
  }
);

// delete  product by id
router.delete(
  "/delete/:id",
  auth.authenticateToken,
  checkRole.checkRole,
  (req, res) => {
    const productId = req.params.id;
    const query = "DELETE FROM product WHERE id = ?";

    connection.query(query, [productId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database Error", details: err });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      return res.status(200).json({ message: "Product deleted successfully" });
    });
  }
);

router.patch(
  "/updateStatus",
  auth.authenticateToken,
  checkRole.checkRole,
  (req, res, next) => {
    let user = req.body;

    var query = "UPDATE product SET status = ? WHERE id = ?";
    connection.query(query, [user.status, user.id], (err, results) => {
      if (err) {
        return res.status(500).json(err);
      }
      if (results.affectedRows == 0) {
        return res.status(404).json({ message: "Product id not found" });
      }
      return res
        .status(200)
        .json({ message: "Product status updated successfully" });
    });
  }
);

module.exports = router;
