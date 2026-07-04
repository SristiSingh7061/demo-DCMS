# 🏭 Departmental Complaint Management System

A web-based **Departmental Complaint Management System** built  to streamline the process of filing, tracking, forwarding, and resolving internal complaints across departments.

---

## 🚀 Features

- 🔐 Employee login via unique Employee Code
- 📝 File complaints to specific departments with concerned person
- 📊 Admin dashboard — monitor all complaints (read-only)
- 👤 Admin can manage users (add/edit employees)
- 🏢 Admin can manage departments (add/close/reopen)
- ❌ Closed departments are hidden from complaint form dropdown
- 📨 Department-wise complaint forwarding to other departments
- 🔄 Status updates — Pending, In Progress, Resolved, Rejected
- 💬 Remarks system with every status update
- 📜 Complete action history for every complaint
- 🎨 Dark luxury UI with gold & rose accents

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL (via XAMPP) |
| Auth | Express Session |
| Password | bcrypt |

---

## 📁 Project Structure

CMS/
├── server.js
├── db.js
├── adminRoutes.js
├── complaintRoutes.js
├── authRoutes.js
├── admin-dashboard.html
├── admin-dashboard.js
├── user-dashboard.html
├── user-dashboard.js
├── login.html
├── login.js
├── style.css
└── common.js
# Install Dependencies
  npm install

# Setup Database
Open XAMPP → Start Apache & MySQL
Open phpMyAdmin
Create database: ccl_cms
Import the SQL file or run migrations

# Run the project
  node server.js

# Open in browser
  http://127.0.0.1:3000

# 📌How It Works
- Admin adds employees and departments
- Employee logs in with their Employee Code
- Employee files a complaint → selects department & concerned person
- Department employee receives complaint → updates status or forwards
- Admin monitors everything from the dashboard
- Closed departments are automatically hidden from complaint form


* Efficient complaint resolution for a better workplace." 🏭

