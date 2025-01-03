const express = require("express");
const connection = require("../connection");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const admin = require("../firebase");
require("dotenv").config();
const auth = require("../services/authentication");
const checkRole = require("../services/checkRole");
const firebaseAdmin = require("../firebase");
const router = express.Router();

// Signup Route
router.post("/signup", (req, res) => {
  const user = req.body;

  // Query to check if the email already exists
  const checkUserQuery =
    "SELECT email, password, role, status FROM user WHERE email = ?";

  connection.query(checkUserQuery, [user.email], (err, results) => {
    if (err) {
      // Handle database query error
      return res
        .status(500)
        .json({ error: "Internal Server Error", details: err });
    }

    // If no user exists with the given email
    if (results.length === 0) {
      // Query to insert a new user
      const insertUserQuery = `
        INSERT INTO user (name, contactNumber, email, password, status, role)
        VALUES (?, ?, ?, ?, "false", "user")
      `;

      connection.query(
        insertUserQuery,
        [user.name, user.contactNumber, user.email, user.password],
        (insertErr, insertResults) => {
          if (insertErr) {
            // Handle database insertion error
            return res
              .status(500)
              .json({ error: "Internal Server Error", details: insertErr });
          }

          // Successfully registered the user
          return res.status(200).json({ message: "Successfully Registered" });
        }
      );
    } else {
      // Email already exists
      return res.status(400).json({ message: "Email Already Exists" });
    }
  });
});

// Login Route
router.post("/login", (req, res) => {
  const user = req.body;
  const checkUserQuery =
    "SELECT email, password, role, status FROM user WHERE email = ?";

  connection.query(checkUserQuery, [user.email], (err, results) => {
    if (!err) {
      if (results.length <= 0 || results[0].password !== user.password) {
        return res.status(401).json({ message: "Incorrect email or password" });
      } else if (results[0].status === "false") {
        return res.status(401).json({ message: "Wait for admin approval" });
      } else if (results[0].password === user.password) {
        const response = {
          email: results[0].email,
          role: results[0].role,
        };
        const accessToken = jwt.sign(response, process.env.ACCESS_TOKEN, {
          expiresIn: "8h",
        });

        res.status(200).json({ token: accessToken });
      } else {
        return res
          .status(400)
          .json({ message: "Somthing went wrong please try again later" });
      }
    }
  });
});

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// Forget Password Route
router.post("/forgotPassword", (req, res) => {
  const user = req.body;
  const checkUserQuery =
    "SELECT email, password, role, status FROM user WHERE email = ?";
  connection.query(checkUserQuery, [user.email], (err, results) => {
    if (!err) {
      if (results.length <= 0) {
        return res
          .status(200)
          .json({ message: "Password sent successfully to your email" });
      } else {
        const mailOptions = {
          from: "Buzzer Restaurant <mostafadevtest@gmail.com>",
          to: results[0].email,
          subject: "Your Login Details - Buzzer Restaurant",
          html: `
            <div style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: auto;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 8px;
              background-color: #f9f9f9;
              color: #333;
            ">
              <h2 style="text-align: center; color: #4CAF50; margin-bottom: 20px;">
                Welcome to Buzzer Restaurant!
              </h2>
              <p style="font-size: 16px; line-height: 1.6;">
                Dear Customer,
              </p>
              <p style="font-size: 16px; line-height: 1.6;">
                We are excited to have you onboard. Here are your login details:
              </p>
              <table style="
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 16px;
              ">
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 40%;">Email</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${results[0].email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Password</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${results[0].password}</td>
                </tr>
              </table>
              <p style="font-size: 16px; line-height: 1.6;">
                Please make sure to keep this information safe. For added security, we recommend updating your password after your first login.
              </p>
              <p style="font-size: 16px; line-height: 1.6; text-align: center;">
                <a href="https://buzzer-restaurant.com/login" style="
                  display: inline-block;
                  padding: 10px 20px;
                  font-size: 16px;
                  color: #fff;
                  background-color: #4CAF50;
                  text-decoration: none;
                  border-radius: 5px;
                ">Login to Your Account</a>
              </p>
              <p style="font-size: 14px; color: #777; margin-top: 20px; text-align: center;">
                If you did not request this email, please ignore it.
              </p>
            </div>
          `,
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            return res
              .status(500)
              .json({ error: "Failed to send email", details: error });
          } else {
            return res
              .status(200)
              .json({ message: "Password sent successfully to your email" });
          }
        });
      }
    } else {
      return res
        .status(500)
        .json({ error: "Internal Server Error", details: err });
    }
  });
});

router.get("/get", auth.authenticateToken, checkRole.checkRole, (req, res) => {
  const query =
    "SELECT id, name, email,contactNumber, role, status FROM user WHERE role = 'user'";
  connection.query(query, (err, results) => {
    if (!err) {
      return res.status(200).json(results);
    } else {
      return res
        .status(500)
        .json({ error: "Internal Server Error", details: err });
    }
  });
});

router.patch("/updateStatus", auth.authenticateToken, (req, res) => {
  const { status, id } = req.body;

  const updateQuery = "UPDATE user SET status = ? WHERE id = ?";
  connection.query(updateQuery, [status, id], (err, results) => {
    if (err) {
      return res.status(500).json({
        error: "Internal Server Error",
        details: err,
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "User ID does not exist" });
    }

    return res.status(200).json({ message: "User updated successfully" });
  });
});

router.get("/checkoken", auth.authenticateToken, (req, res) => {
  return res.status(200).json({ message: "true" });
});

router.post("/changePassword", auth.authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const email = res.locals.email;

  const validateQuery = "SELECT * FROM user WHERE email = ? AND password = ?";
  connection.query(validateQuery, [email, oldPassword], (err, results) => {
    if (err) {
      return res.status(500).json({
        error: "Internal Server Error",
        details: err,
      });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "Incorrect Old Password" });
    }

    if (results[0].password === oldPassword) {
      const updateQuery = "UPDATE user SET password = ? WHERE email = ?";
      connection.query(updateQuery, [newPassword, email], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({
            error: "Internal Server Error",
            details: updateErr,
          });
        }

        return res
          .status(200)
          .json({ message: "Password Updated Successfully" });
      });
    } else {
      return res.status(400).json({
        message: "Something went wrong. Please try again later.",
      });
    }
  });
});

// Send OTP Route
router.post("/sendOtp", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

  

    return res.status(200).json({
      success: true,
      message: "Authentication token created",
      token: customToken,
    });
  } catch (error) {
    console.error("Error in sendOtp:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate OTP process",
      error: error.message,
    });
  }
});


// Send OTP Route
router.post("/sendOtp", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    // Create a custom token for phone authentication
    const customToken = await admin.auth().createCustomToken(phoneNumber);

    return res.status(200).json({ success: true, message: "Authentication token created", token: customToken });
  } catch (error) {
    console.error("Error in sendOtp:", error);
    return res.status(500).json({ success: false, message: "Failed to initiate OTP process", error: error.message });
  }
});

// Verify OTP Route
router.post("/verifyOtp", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: "ID token is required" });
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    return res.status(200).json({ success: true, message: "OTP verified successfully", user: decodedToken });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return res.status(500).json({ success: false, message: "Failed to verify OTP", error: error.message });
  }
});

module.exports = router;
