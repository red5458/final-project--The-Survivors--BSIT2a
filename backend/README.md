# Smart Attendance System Backend

## 📌 Overview
This backend system is built using Node.js, Express, and MongoDB.
It handles user authentication and attendance tracking with auto-time classification.

---

## 🚀 How to Run

1. Install dependencies:
npm install

2. Start server:
npm start

---

## 🔌 Database Connection
MongoDB is connected using Mongoose.

Connection string is stored in `.env`:
MONGO_URI=your_mongodb_connection

---

## 📦 Models

### User Model
- username
- email
- password (hashed)
- role (student, teacher, admin)
- studentId

### Attendance Model
- studentId
- timeIn
- status (Early, On-Time, Late, Absent)

---

## 🔗 API Routes

### Auth Routes
POST /api/auth/register → Register user  
POST /api/auth/login → Login user  

### Attendance Routes
POST /api/attendance/checkin → Record attendance  
GET /api/attendance → Get all records  
PUT /api/attendance/:id → Update record  
DELETE /api/attendance/:id → Delete record  

---

## 🧪 Testing
API tested using Thunder Client.

---

## 👥 Group Members
- Jexson Sedon
- John Roan Ballester
- Michelle Diaz
- Judy Pearl Balictar
- Alyssa Jenille Reantaso
- Ronel Garcia