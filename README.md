# README: Buzzer Restaurant Backend Task

## Project Overview

This project is a **backend task** for the Buzzer Restaurant e-commerce web app. It is built using **Node.js** and **Express.js**, with **MySQL** as the database and **Firebase** for OTP-based authentication. The task involves implementing RESTful APIs for user authentication, product and category management, and shopping cart functionality.

## Technologies Used

- **Backend Framework:** Node.js, Express.js
- **Database:** MySQL
- **Authentication:** Firebase OTP, JWT
- **File Upload:** Multer
- **Email Service:** Nodemailer

---

# API Endpoints Documentation

---

## User Authentication

| **Method** | **Endpoint**                  | **Description**   |
| ---------- | ----------------------------- | ----------------- |
| `POST`     | `/api/v1/user/signup`         | User registration |
| `POST`     | `/api/v1/user/login`          | User login        |
| `POST`     | `/api/v1/user/forgotPassword` | Forgot password   |
| `POST`     | `/api/v1/user/changePassword` | Change password   |

---

## User Management

| **Method** | **Endpoint**                | **Description**                 |
| ---------- | --------------------------- | ------------------------------- |
| `GET`      | `/api/v1/user/get`          | Fetch all users (admin only)    |
| `PATCH`    | `/api/v1/user/updateStatus` | Update user status (admin only) |

---

## Category Management

| **Method** | **Endpoint**                    | **Description**                 |
| ---------- | ------------------------------- | ------------------------------- |
| `POST`     | `/api/v1/categories/add`        | Add a new category (admin only) |
| `GET`      | `/api/v1/categories/getAll`     | Fetch all categories            |
| `PATCH`    | `/api/v1/categories/update/:id` | Update category (admin only)    |
| `DELETE`   | `/api/v1/categories/delete/:id` | Delete category (admin only)    |

---

## Product Management

| **Method** | **Endpoint**                         | **Description**                    |
| ---------- | ------------------------------------ | ---------------------------------- |
| `POST`     | `/api/v1/products/add`               | Add a new product (admin only)     |
| `GET`      | `/api/v1/products/getAll`            | Fetch all products                 |
| `GET`      | `/api/v1/products/getByCategory/:id` | Fetch products by category         |
| `GET`      | `/api/v1/products/getById/:id`       | Fetch product by ID                |
| `PATCH`    | `/api/v1/products/update/:id`        | Update product (admin only)        |
| `DELETE`   | `/api/v1/products/delete/:id`        | Delete product (admin only)        |
| `PATCH`    | `/api/v1/products/updateStatus`      | Update product status (admin only) |

---

## Cart Management

| **Method** | **Endpoint**                  | **Description**                     |
| ---------- | ----------------------------- | ----------------------------------- |
| `POST`     | `/api/v1/cart/generateReport` | Generate a cart report              |
| `GET`      | `/api/v1/cart/getPdf`         | Download cart report as PDF         |
| `GET`      | `/api/v1/cart/getCats`        | Fetch cart categories               |
| `DELETE`   | `/api/v1/cart/delete/:id`     | Delete a cart item by ID (e.g., 13) |

---
