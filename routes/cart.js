const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");
const pdf = require("html-pdf");
const connection = require("../connection");
const auth = require("../services/authentication");

const router = express.Router();

router.post("/generateReport", auth.authenticateToken, (req, res) => {
  const generateUuid = uuidv4();
  const orderDetails = req.body;

  let productDetailsReport;
  try {
    // Handle both string and array inputs
    productDetailsReport =
      typeof orderDetails.productDetails === "string"
        ? JSON.parse(orderDetails.productDetails)
        : orderDetails.productDetails;

    // Ensure productDetailsReport is always an array
    if (!Array.isArray(productDetailsReport)) {
      productDetailsReport = [productDetailsReport];
    }
  } catch (err) {
    return res.status(400).json({ error: "Invalid productDetails JSON" });
  }

  const query = `
    INSERT INTO cart 
    (name, uuid, email, contactNumber, paymentMethod, total, productDetails, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  connection.query(
    query,
    [
      orderDetails.name,
      generateUuid,
      orderDetails.email,
      orderDetails.contactNumber,
      orderDetails.paymentMethod,
      orderDetails.totalAmount,
      JSON.stringify(productDetailsReport),
      res.locals.email,
    ],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Failed to save order details" });
      }

      ejs.renderFile(
        path.join(__dirname, "report.ejs"),
        {
          productDetails: productDetailsReport,
          name: orderDetails.name,
          email: orderDetails.email,
          contactNumber: orderDetails.contactNumber,
          paymentMethod: orderDetails.paymentMethod,
          totalAmount: orderDetails.totalAmount,
        },
        (err, html) => {
          if (err) {
            console.error("EJS render error:", err);
            return res
              .status(500)
              .json({ error: "Failed to generate PDF template" });
          }

          const pdfDir = "./generated_pdf";
          if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
          }

          const pdfOptions = {
            format: "A4",
            border: {
              top: "100px",
              right: "20px",
              bottom: "20px",
              left: "20px",
            },
          };

          pdf
            .create(html, pdfOptions)
            .toFile(`${pdfDir}/${generateUuid}.pdf`, (err, result) => {
              if (err) {
                console.error("PDF generation error:", err);
                return res
                  .status(500)
                  .json({ error: "Failed to create PDF file" });
              }
              return res.status(200).json({ uuid: generateUuid });
            });
        }
      );
    }
  );
});

router.post("/getPdf", auth.authenticateToken, (req, res) => {
  const orderDetails = req.body;
  const pdfPath = path.join(
    __dirname,
    "../generated_pdf",
    `${orderDetails.uuid}.pdf`
  );

  if (fs.existsSync(pdfPath)) {
    res.contentType("application/pdf");
    fs.createReadStream(pdfPath).pipe(res);
  } else {
    let productDetailsReport;
    try {
      productDetailsReport =
        typeof orderDetails.productDetails === "string"
          ? JSON.parse(orderDetails.productDetails)
          : orderDetails.productDetails;

      if (!Array.isArray(productDetailsReport)) {
        productDetailsReport = [productDetailsReport];
      }
    } catch (err) {
      return res.status(400).json({ error: "Invalid productDetails JSON" });
    }

    ejs.renderFile(
      path.join(__dirname, "report.ejs"),
      {
        productDetails: productDetailsReport,
        name: orderDetails.name,
        email: orderDetails.email,
        contactNumber: orderDetails.contactNumber,
        paymentMethod: orderDetails.paymentMethod,
        totalAmount: orderDetails.totalAmount,
      },
      (err, html) => {
        if (err) {
          console.error("EJS render error:", err);
          return res
            .status(500)
            .json({ error: "Failed to generate PDF template" });
        }

        const pdfOptions = {
          format: "A4",
          border: {
            top: "100px",
            right: "20px",
            bottom: "20px",
            left: "20px",
          },
        };

        pdf.create(html, pdfOptions).toFile(pdfPath, (err, result) => {
          if (err) {
            console.error("PDF generation error:", err);
            return res.status(500).json({ error: "Failed to create PDF file" });
          }
          res.contentType("application/pdf");
          fs.createReadStream(pdfPath).pipe(res);
        });
      }
    );
  }
});

router.get("/getCarts", auth.authenticateToken, (req, res) => {
  const query = "SELECT * FROM cart ORDER BY id DESC";

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Failed to fetch cart data" });
    }

    return res.status(200).json(results);
  });
});

router.delete("/delete/:id", auth.authenticateToken, (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM cart WHERE id = ?";

  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error("Error deleting cart:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while deleting the cart" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Cart ID not found" });
    }
    return res.status(200).json({ message: "Cart deleted successfully" });
  });
});

module.exports = router;
