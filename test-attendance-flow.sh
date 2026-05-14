#!/bin/bash

# Attendance System Testing Script
# Run these commands sequentially to test the session-based attendance flow

API_URL="http://localhost:3000/api"
ADMIN_TOKEN=""
TEACHER_TOKEN=""
STUDENT_TOKEN=""
SESSION_ID=""

echo "🧪 Attendance System Test Script"
echo "=================================="
echo ""

# Step 1: Admin Login
echo "1️⃣ Admin Login"
ADMIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }')
ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Admin Token: $ADMIN_TOKEN"
echo ""

# Step 2: Enroll a student
echo "2️⃣ Enroll Student in Class"
curl -s -X POST "$API_URL/roster/enroll" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "studentId": "2026-1234-56789",
    "className": "Biology 101"
  }' | jq .
echo ""

# Step 3: Create Attendance Session
echo "3️⃣ Create Attendance Session"
SESSION_RESPONSE=$(curl -s -X POST "$API_URL/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "sessionDate": "2026-05-14T09:00:00Z",
    "className": "Biology 101",
    "startTime": "09:00",
    "endTime": "10:30",
    "allowanceMinutes": 5,
    "notes": "Test session"
  }')
echo $SESSION_RESPONSE | jq .
SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4 | head -1)
echo "Session ID: $SESSION_ID"
echo ""

# Step 4: Student Login
echo "4️⃣ Student Login"
STUDENT_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "Student@123"
  }')
STUDENT_TOKEN=$(echo $STUDENT_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Student Token: $STUDENT_TOKEN"
echo ""

# Step 5: Student Check-In
echo "5️⃣ Student Check-In to Session"
curl -s -X POST "$API_URL/attendance/checkin-session" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"subject\": \"Biology 101\",
    \"notes\": \"Present\"
  }" | jq .
echo ""

# Step 6: Get Session Details
echo "6️⃣ Get Session Details (with attendance)"
curl -s -X GET "$API_URL/sessions/$SESSION_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
echo ""

# Step 7: Close Session (marks absences)
echo "7️⃣ Close Session (Auto-mark Absences)"
curl -s -X POST "$API_URL/sessions/$SESSION_ID/close" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
echo ""

# Step 8: View Class Roster
echo "8️⃣ View Class Roster"
curl -s -X GET "$API_URL/roster/class/Biology%20101" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
echo ""

# Step 9: Get Student Attendance Records
echo "9️⃣ Get Student's Attendance Records"
curl -s -X GET "$API_URL/attendance/my-attendance" \
  -H "Authorization: Bearer $STUDENT_TOKEN" | jq .
echo ""

echo "✅ Test Complete!"
